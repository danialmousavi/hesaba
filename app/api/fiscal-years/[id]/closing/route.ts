import { createHash } from "node:crypto";
import { z } from "zod";
import { Prisma, type JournalEntryKind } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { buildClosingPreview, closingInputSchema } from "@/lib/fiscal-close-preview";
import type { ClosingLine } from "@/lib/fiscal-close-calculation";
import { lockJournalAccounts, markPartyAccountsUsed } from "@/lib/journal-account-locks";
import { prisma } from "@/lib/prisma";
import { isTransactionConflict } from "@/lib/prisma-errors";

const schema = closingInputSchema.extend({ requestKey: z.uuid().transform((value) => value.toLowerCase()), previewFingerprint: z.string().regex(/^[0-9a-f]{64}$/) });

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true } });
  if (!member) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 403 });
  const id = z.string().cuid().safeParse((await params).id);
  if (!id.success) return Response.json({ error: "سال مالی معتبر نیست." }, { status: 400 });
  const closing = await prisma.fiscalClosing.findUnique({ where: { organizationId_sourceYearId: { organizationId: member.organizationId, sourceYearId: id.data } }, select: { summary: true, actorName: true, createdAt: true } });
  if (!closing) return Response.json({ error: "عملیات اختتامیه پیدا نشد." }, { status: 404 });
  return Response.json({ closing: closing.summary, actorName: closing.actorName, createdAt: closing.createdAt }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { id: true, organizationId: true, role: true } });
  if (!member || member.role !== "ADMIN") return Response.json({ error: "فقط مدیر سازمان اجازه ثبت اختتامیه دارد." }, { status: 403 });
  const id = z.string().cuid().safeParse((await params).id);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!id.success || !parsed.success) return Response.json({ error: "اطلاعات ثبت اختتامیه معتبر نیست." }, { status: 400 });
  const { requestKey, previewFingerprint, ...input } = parsed.data;
  const requestHash = createHash("sha256").update(JSON.stringify({ sourceYearId: id.data, input, previewFingerprint })).digest("hex");
  const previous = async () => prisma.fiscalClosing.findUnique({ where: { organizationId_requestKey: { organizationId: member.organizationId, requestKey } }, select: { requestHash: true, summary: true } });
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Membership" WHERE id = ${member.id} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const currentMember = await tx.membership.findFirst({ where: { id: member.id, organizationId: member.organizationId, userId: session.user.id, role: "ADMIN" }, select: { id: true } });
      if (!currentMember) return { status: 403, error: "دسترسی مدیر تغییر کرده است." } as const;
      const prior = await tx.fiscalClosing.findUnique({ where: { organizationId_requestKey: { organizationId: member.organizationId, requestKey } }, select: { requestHash: true, summary: true } });
      if (prior) return prior.requestHash === requestHash ? { status: 200, result: prior.summary, replay: true } as const : { status: 409, error: "شناسه درخواست قبلاً برای اطلاعات دیگری استفاده شده است." } as const;
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${id.data} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      let preview = await buildClosingPreview(tx, member.organizationId, id.data, input);
      if (!preview) return { status: 404, error: "سال مالی پیدا نشد." } as const;
      if (preview.blockers.length || !preview.calculation) return { status: 409, error: "اختتامیه قابل ثبت نیست؛ پیش‌نمایش و موارد توقف را دوباره بررسی کنید." } as const;
      const allLines = [...preview.calculation.temporaryLines, ...preview.calculation.closingLines, ...preview.calculation.openingLines];
      const accountIds = [...new Set([...allLines.map((line) => line.accountId), input.equityAccountId])];
      if (!await lockJournalAccounts(tx, member.organizationId, accountIds)) return { status: 409, error: "حساب یا شخص مرتبط تغییر کرده است؛ پیش‌نمایش را دوباره بررسی کنید." } as const;
      preview = await buildClosingPreview(tx, member.organizationId, id.data, input);
      if (!preview || preview.blockers.length || !preview.calculation || preview.previewFingerprint !== previewFingerprint) return { status: 409, error: "اطلاعات پس از پیش‌نمایش تغییر کرده است؛ پیش‌نمایش تازه بگیرید." } as const;
      if (await tx.fiscalClosing.findUnique({ where: { organizationId_sourceYearId: { organizationId: member.organizationId, sourceYearId: id.data } }, select: { id: true } })) return { status: 409, error: "این سال مالی قبلاً منتقل شده است." } as const;
      const max = await tx.journalEntry.aggregate({ where: { organizationId: member.organizationId, fiscalYearId: id.data }, _max: { number: true } });
      let number = max._max.number ?? 0;
      if (number + Number(preview.calculation.temporaryLines.length > 0) + Number(preview.calculation.closingLines.length > 0) > 2147483647) return { status: 409, error: "شماره سند اختتامیه در دسترس نیست." } as const;
      async function makeEntry(yearId: string, date: Date, entryNumber: number, kind: JournalEntryKind, description: string, lines: ClosingLine[]) {
        if (!lines.length) return null;
        const entry = await tx.journalEntry.create({ data: { organizationId: member!.organizationId, fiscalYearId: yearId, number: entryNumber, date, kind, description, lines: { create: lines } }, select: { id: true, number: true } });
        await tx.journalEntry.update({ where: { id: entry.id }, data: { status: "POSTED" } });
        await tx.journalEvent.create({ data: { organizationId: member!.organizationId, entryId: entry.id, actorId: session!.user.id, actorName: session!.user.name, action: "POSTED" } });
        return entry;
      }
      const end = new Date(`${preview.fiscalYear.endDate}T00:00:00Z`);
      const temporary = await makeEntry(id.data, end, preview.calculation.temporaryLines.length ? ++number : number, "CLOSING_TEMPORARY", "بستن حساب‌های موقت", preview.calculation.temporaryLines);
      const permanent = await makeEntry(id.data, end, preview.calculation.closingLines.length ? ++number : number, "CLOSING_PERMANENT", "اختتامیه حساب‌های دائمی", preview.calculation.closingLines);
      await markPartyAccountsUsed(tx, member.organizationId, accountIds);
      await tx.fiscalYear.update({ where: { id: id.data }, data: { status: "CLOSED" } });
      const nextYear = await tx.fiscalYear.create({ data: { organizationId: member.organizationId, name: input.nextYear.name, startDate: new Date(`${input.nextYear.startDate}T00:00:00Z`), endDate: new Date(`${input.nextYear.endDate}T00:00:00Z`) }, select: { id: true, name: true } });
      const opening = await makeEntry(nextYear.id, new Date(`${input.nextYear.startDate}T00:00:00Z`), 1, "OPENING", "افتتاحیه حساب‌های دائمی", preview.calculation.openingLines);
      const closingId = crypto.randomUUID();
      const summary = { id: closingId, sourceYearId: id.data, targetYear: nextYear, result: preview.calculation.result, entries: { temporary, permanent, opening } };
      await tx.fiscalClosing.create({ data: { id: closingId, organizationId: member.organizationId, sourceYearId: id.data, targetYearId: nextYear.id, temporaryEntryId: temporary?.id, permanentEntryId: permanent?.id, openingEntryId: opening?.id, requestKey, requestHash, previewFingerprint, actorId: session.user.id, actorName: session.user.name, summary } });
      await tx.fiscalYearEvent.createMany({ data: [{ organizationId: member.organizationId, fiscalYearId: id.data, actorId: session.user.id, actorName: session.user.name, type: "CLOSED", details: { previousStatus: "OPEN", status: "CLOSED", closingId } }, { organizationId: member.organizationId, fiscalYearId: nextYear.id, actorId: session.user.id, actorName: session.user.name, type: "CREATED", details: { name: nextYear.name, startDate: input.nextYear.startDate, endDate: input.nextYear.endDate, closingId } }] });
      return { status: 201, result: summary, replay: false } as const;
    }, { isolationLevel: "Serializable", timeout: 30000 });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ closing: result.result, replay: result.replay }, { status: result.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isTransactionConflict(error) || (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2004"].includes(error.code))) {
      const prior = await previous();
      if (prior?.requestHash === requestHash) return Response.json({ closing: prior.summary, replay: true }, { headers: { "Cache-Control": "no-store" } });
      return Response.json({ error: "تغییر هم‌زمان رخ داد؛ وضعیت سال و پیش‌نمایش را دوباره بررسی کنید." }, { status: 409 });
    }
    console.error("Fiscal closing failed", error);
    return Response.json({ error: "ثبت اختتامیه انجام نشد؛ پیش از تلاش دوباره وضعیت سال مالی را بررسی کنید." }, { status: 500 });
  }
}
