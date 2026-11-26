import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lockJournalAccounts, markPartyAccountsUsed } from "@/lib/journal-account-locks";
import { isTransactionConflict } from "@/lib/prisma-errors";

const amount = z.string().regex(/^(0|[1-9]\d{0,19})$/);
const schema = z.object({
  number: z.number().int().positive().max(2147483647),
  date: z.iso.date(),
  description: z.string().trim().min(1).max(500),
  lines: z.array(z.object({ accountId: z.string().cuid(), description: z.string().trim().max(500).optional(), debit: amount, credit: amount }).strict().refine((line) => (line.debit === "0") !== (line.credit === "0"))).min(1).max(100),
}).strict();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true } });
  if (!member) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 403 });
  const { id } = await params;
  if (!z.string().cuid().safeParse(id).success) return Response.json({ error: "شناسه سند معتبر نیست." }, { status: 400 });
  try {
    const entry = await prisma.journalEntry.findFirst({ where: { id, organizationId: member.organizationId }, select: { id: true, number: true, date: true, description: true, status: true, kind: true, createdAt: true, updatedAt: true, fiscalYear: { select: { id: true, name: true, status: true } }, lines: { orderBy: { id: "asc" }, select: { id: true, description: true, debit: true, credit: true, account: { select: { id: true, code: true, name: true, type: true } } } }, reversal: { select: { reversalEntryId: true } }, reversalOf: { select: { sourceEntryId: true } }, invoice: { select: { id: true, number: true } }, payment: { select: { id: true } }, financialTransaction: { select: { id: true } } } });
    if (!entry) return Response.json({ error: "سند پیدا نشد." }, { status: 404 });
    const totals = entry.lines.reduce((sum, line) => ({ debit: sum.debit + BigInt(line.debit.toFixed(0)), credit: sum.credit + BigInt(line.credit.toFixed(0)) }), { debit: 0n, credit: 0n });
    return Response.json({ entry, totals: { debit: totals.debit.toString(), credit: totals.credit.toString() } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Journal detail failed", error);
    return Response.json({ error: "دریافت جزئیات سند انجام نشد." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true } });
  if (!member || member.role === "VIEWER") return Response.json({ error: "اجازهٔ ویرایش سند ندارید." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "اطلاعات سند معتبر نیست." }, { status: 400 });
  const date = new Date(`${parsed.data.date}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== parsed.data.date) return Response.json({ error: "تاریخ معتبر نیست." }, { status: 400 });
  const { id } = await params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const initial = await tx.journalEntry.findFirst({ where: { id, organizationId: member.organizationId }, select: { fiscalYearId: true } });
      if (!initial) return { status: 404, error: "سند پیدا نشد." } as const;
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${initial.fiscalYearId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "JournalEntry" WHERE id = ${id} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const entry = await tx.journalEntry.findFirst({ where: { id, organizationId: member.organizationId }, select: { status: true, reversalOf: { select: { sourceEntryId: true } }, fiscalYear: { select: { status: true, startDate: true, endDate: true } } } });
      if (!entry) return { status: 404, error: "سند پیدا نشد." } as const;
      if (entry.status !== "DRAFT") return { status: 409, error: "سند ثبت‌شده قابل ویرایش نیست." } as const;
      if (entry.reversalOf) return { status: 409, error: "ردیف‌ها و مشخصات پیش‌نویس برگشتی قابل ویرایش نیستند؛ در صورت نیاز پیش‌نویس را حذف و دوباره ایجاد کنید." } as const;
      if (entry.fiscalYear.status !== "OPEN" || date < entry.fiscalYear.startDate || date > entry.fiscalYear.endDate) return { status: 409, error: "سال مالی بسته است یا تاریخ خارج از محدودهٔ آن است." } as const;
      const ids = await lockJournalAccounts(tx, member.organizationId, parsed.data.lines.map((line) => line.accountId));
      if (!ids) return { status: 400, error: "حساب یا شخص متصل معتبر و فعال نیست؛ در صورت تغییر هم‌زمان دوباره تلاش کنید." } as const;
      await tx.journalLine.deleteMany({ where: { organizationId: member.organizationId, entryId: id } });
      const updated = await tx.journalEntry.update({ where: { id }, data: { number: parsed.data.number, date, description: parsed.data.description, lines: { create: parsed.data.lines.map((line) => ({ accountId: line.accountId, description: line.description, debit: line.debit, credit: line.credit })) } }, select: { id: true, number: true, status: true } });
      await markPartyAccountsUsed(tx, member.organizationId, ids);
      return { status: 200, entry: updated } as const;
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ entry: result.entry });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ error: "شمارهٔ سند در این سال مالی تکراری است." }, { status: 409 });
    if (isTransactionConflict(error)) return Response.json({ error: "تغییر هم‌زمان رخ داد؛ دوباره تلاش کنید." }, { status: 409 });
    console.error("Journal draft update failed", error);
    return Response.json({ error: "ویرایش پیش‌نویس انجام نشد." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true } });
  if (!member || member.role === "VIEWER") return Response.json({ error: "اجازهٔ حذف پیش‌نویس ندارید." }, { status: 403 });
  const { id } = await params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const initial = await tx.journalEntry.findFirst({ where: { id, organizationId: member.organizationId }, select: { fiscalYearId: true } });
      if (!initial) return { status: 404, error: "سند پیدا نشد." } as const;
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${initial.fiscalYearId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "JournalEntry" WHERE id = ${id} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const entry = await tx.journalEntry.findFirst({ where: { id, organizationId: member.organizationId }, select: { status: true, reversalOf: { select: { sourceEntryId: true } }, fiscalYear: { select: { status: true } } } });
      if (!entry) return { status: 404, error: "سند پیدا نشد." } as const;
      if (entry.status !== "DRAFT") return { status: 409, error: "سند ثبت‌شده قابل حذف نیست." } as const;
      if (entry.fiscalYear.status !== "OPEN") return { status: 409, error: "حذف پیش‌نویس در سال مالی بسته مجاز نیست." } as const;
      if (entry.reversalOf) {
        await tx.journalReversal.delete({ where: { organizationId_sourceEntryId: { organizationId: member.organizationId, sourceEntryId: entry.reversalOf.sourceEntryId } } });
        await tx.journalEvent.create({ data: { organizationId: member.organizationId, entryId: entry.reversalOf.sourceEntryId, actorId: session.user.id, actorName: session.user.name, action: "REVERSAL_DRAFT_DELETED" } });
      }
      await tx.journalLine.deleteMany({ where: { organizationId: member.organizationId, entryId: id } });
      await tx.journalEntry.delete({ where: { id } });
      return { status: 200 } as const;
    });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Journal draft deletion failed", error);
    return Response.json({ error: "حذف پیش‌نویس انجام نشد." }, { status: 500 });
  }
}
