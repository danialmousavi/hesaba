import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { lockJournalAccounts, markPartyAccountsUsed } from "@/lib/journal-account-locks";
import { prisma } from "@/lib/prisma";
import { isTransactionConflict } from "@/lib/prisma-errors";

const schema = z.strictObject({ fiscalYearId: z.string().cuid(), date: z.iso.date(), description: z.string().trim().min(1).max(500).optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true } });
  if (!member || member.role === "VIEWER") return Response.json({ error: "اجازه ایجاد سند برگشتی ندارید." }, { status: 403 });
  const id = z.string().cuid().safeParse((await params).id);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!id.success || !parsed.success) return Response.json({ error: "اطلاعات سند برگشتی معتبر نیست." }, { status: 400 });
  const input = parsed.data;
  const date = new Date(`${input.date}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== input.date) return Response.json({ error: "تاریخ معتبر نیست." }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${input.fiscalYearId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const year = await tx.fiscalYear.findFirst({ where: { id: input.fiscalYearId, organizationId: member.organizationId, status: "OPEN", startDate: { lte: date }, endDate: { gte: date } }, select: { id: true } });
      if (!year) return { status: 400, error: "سال مالی باز یا تاریخ معتبر نیست." } as const;
      await tx.$queryRaw`SELECT id FROM "JournalEntry" WHERE id = ${id.data} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const source = await tx.journalEntry.findFirst({ where: { id: id.data, organizationId: member.organizationId }, select: { id: true, kind: true, number: true, status: true, date: true, description: true, reversal: { select: { reversalEntryId: true } }, reversalOf: { select: { sourceEntryId: true } }, invoice: { select: { id: true } }, payment: { select: { id: true } }, financialTransaction: { select: { id: true } }, lines: { select: { accountId: true, description: true, debit: true, credit: true }, orderBy: { id: "asc" } } } });
      if (!source) return { status: 404, error: "سند اصلی پیدا نشد." } as const;
      if (source.status !== "POSTED") return { status: 409, error: "فقط سند ثبت‌شده قابل برگشت است." } as const;
      if (source.kind !== "NORMAL") return { status: 409, error: "سند سیستمی اختتامیه یا افتتاحیه قابل برگشت مستقیم نیست." } as const;
      if (source.reversal || source.reversalOf) return { status: 409, error: "برای این سند برگشت وجود دارد یا خود سند برگشتی است." } as const;
      if (source.invoice || source.payment || source.financialTransaction) return { status: 409, error: "سند مرتبط با فاکتور، دریافت، پرداخت یا درآمد و هزینه باید از فرایند اصلاح همان عملیات برگشت داده شود؛ این فرایند هنوز موجود نیست." } as const;
      if (date < source.date) return { status: 400, error: "تاریخ برگشت نباید پیش از تاریخ سند اصلی باشد." } as const;
      if (source.lines.length < 2 || source.lines.length > 100) return { status: 409, error: "تعداد ردیف‌های سند اصلی برای برگشت معتبر نیست." } as const;
      let debit = 0n, credit = 0n;
      for (const line of source.lines) { debit += BigInt(line.debit.toFixed(0)); credit += BigInt(line.credit.toFixed(0)); }
      if (debit <= 0n || debit !== credit) return { status: 409, error: "سند اصلی تراز نیست و قابل برگشت نیست." } as const;
      const ids = await lockJournalAccounts(tx, member.organizationId, source.lines.map((line) => line.accountId));
      if (!ids) return { status: 409, error: "حساب یا شخص متصل به سند فعال و معتبر نیست." } as const;
      const max = await tx.journalEntry.aggregate({ where: { organizationId: member.organizationId, fiscalYearId: year.id }, _max: { number: true } });
      const number = (max._max.number ?? 0) + 1;
      if (number > 2147483647) return { status: 409, error: "شماره سند جدید در دسترس نیست." } as const;
      const entry = await tx.journalEntry.create({ data: { organizationId: member.organizationId, fiscalYearId: year.id, number, date, description: input.description ?? `برگشت سند ${source.number} — ${source.description}`.slice(0, 500), lines: { create: source.lines.map((line) => ({ accountId: line.accountId, description: line.description, debit: line.credit, credit: line.debit })) } }, select: { id: true, fiscalYearId: true, number: true, date: true, description: true, status: true, lines: { select: { accountId: true, description: true, debit: true, credit: true } } } });
      await markPartyAccountsUsed(tx, member.organizationId, ids);
      await tx.journalReversal.create({ data: { organizationId: member.organizationId, sourceEntryId: source.id, reversalEntryId: entry.id, actorId: session.user.id, actorName: session.user.name } });
      await tx.journalEvent.create({ data: { organizationId: member.organizationId, entryId: source.id, actorId: session.user.id, actorName: session.user.name, action: "REVERSAL_DRAFT_CREATED" } });
      return { status: 201, entry, source: { id: source.id, number: source.number } } as const;
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ entry: result.entry, source: result.source }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isTransactionConflict(error) || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) return Response.json({ error: "تغییر هم‌زمان رخ داد یا برگشت قبلاً ایجاد شده است؛ فهرست اسناد را بررسی کنید." }, { status: 409 });
    console.error("Journal reversal creation failed", error);
    return Response.json({ error: "ایجاد پیش‌نویس برگشتی انجام نشد." }, { status: 500 });
  }
}
