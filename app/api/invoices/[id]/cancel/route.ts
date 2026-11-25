import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { invoiceFields, invoiceMembership, serializeInvoice } from "@/lib/invoice-api";
import { lockJournalAccounts, markPartyAccountsUsed } from "@/lib/journal-account-locks";
import { prisma } from "@/lib/prisma";
import { isTransactionConflict } from "@/lib/prisma-errors";

const schema = z.strictObject({ revision: z.number().int().min(0).max(2147483646), date: z.iso.date(), reason: z.string().trim().min(1).max(500) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await invoiceMembership(request);
  if (!member || member.role === "VIEWER") return Response.json({ error: "اجازه ابطال فاکتور ندارید." }, { status: 403 });
  const id = z.string().cuid().safeParse((await params).id);
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!id.success || !input.success) return Response.json({ error: "اطلاعات ابطال معتبر نیست." }, { status: 400 });
  const date = new Date(`${input.data.date}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== input.data.date) return Response.json({ error: "تاریخ معتبر نیست." }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const initial = await tx.invoice.findFirst({ where: { id: id.data, organizationId: member.organizationId }, select: { fiscalYearId: true } });
      if (!initial) return { status: 404, error: "فاکتور پیدا نشد." } as const;
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${initial.fiscalYearId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${id.data} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const invoice = await tx.invoice.findFirst({ where: { id: id.data, organizationId: member.organizationId }, select: { id: true, number: true, date: true, status: true, revision: true, fiscalYearId: true, journalEntryId: true, fiscalYear: { select: { status: true, startDate: true, endDate: true } }, allocations: { select: { id: true }, take: 1 }, journalEntry: { select: { id: true, status: true, reversal: { select: { reversalEntryId: true } }, lines: { select: { accountId: true, debit: true, credit: true, description: true } } } } } });
      if (!invoice) return { status: 404, error: "فاکتور پیدا نشد." } as const;
      if (invoice.status !== "ISSUED") return { status: 409, error: "فقط فاکتور صادرشده قابل ابطال است." } as const;
      if (invoice.revision !== input.data.revision) return { status: 409, error: "فاکتور تغییر کرده است؛ دوباره آن را بررسی کنید." } as const;
      if (invoice.fiscalYear.status !== "OPEN" || date < invoice.date || date < invoice.fiscalYear.startDate || date > invoice.fiscalYear.endDate) return { status: 409, error: "تاریخ ابطال باید در سال مالی باز فاکتور و در تاریخ صدور یا پس از آن باشد." } as const;
      if (invoice.allocations.length) return { status: 409, error: "فاکتور دارای تخصیص دریافت است و تا اصلاح دریافت قابل ابطال نیست." } as const;
      const source = invoice.journalEntry;
      if (!source || source.status !== "POSTED" || source.reversal || source.lines.length < 2 || source.lines.length > 100) return { status: 409, error: "سند حسابداری فاکتور برای ابطال معتبر نیست." } as const;
      let debit = 0n, credit = 0n;
      for (const line of source.lines) { debit += BigInt(line.debit.toFixed(0)); credit += BigInt(line.credit.toFixed(0)); }
      if (debit <= 0n || debit !== credit) return { status: 409, error: "سند حسابداری فاکتور متوازن نیست." } as const;
      const accountIds = await lockJournalAccounts(tx, member.organizationId, source.lines.map((line) => line.accountId));
      if (!accountIds) return { status: 409, error: "حساب یا شخص مرتبط با سند فعال و معتبر نیست." } as const;
      const last = await tx.journalEntry.aggregate({ where: { organizationId: member.organizationId, fiscalYearId: invoice.fiscalYearId }, _max: { number: true } });
      const number = (last._max.number ?? 0) + 1;
      if (number > 2147483647) return { status: 409, error: "شماره سند جدید در دسترس نیست." } as const;
      const entry = await tx.journalEntry.create({ data: { organizationId: member.organizationId, fiscalYearId: invoice.fiscalYearId, number, date, description: `ابطال فاکتور فروش ${invoice.number}`, lines: { create: source.lines.map((line) => ({ accountId: line.accountId, description: line.description, debit: line.credit, credit: line.debit })) } }, select: { id: true } });
      await markPartyAccountsUsed(tx, member.organizationId, accountIds);
      await tx.journalReversal.create({ data: { organizationId: member.organizationId, sourceEntryId: source.id, reversalEntryId: entry.id, actorId: session.user.id, actorName: session.user.name } });
      await tx.journalEntry.update({ where: { id: entry.id }, data: { status: "POSTED" } });
      await tx.journalEvent.createMany({ data: [{ organizationId: member.organizationId, entryId: source.id, actorId: session.user.id, actorName: session.user.name, action: "REVERSAL_DRAFT_CREATED" }, { organizationId: member.organizationId, entryId: entry.id, actorId: session.user.id, actorName: session.user.name, action: "POSTED" }] });
      await tx.invoiceCancellation.create({ data: { organizationId: member.organizationId, invoiceId: invoice.id, reversalEntryId: entry.id, reason: input.data.reason, actorId: session.user.id, actorName: session.user.name } });
      const cancelled = await tx.invoice.update({ where: { id: invoice.id }, data: { status: "CANCELLED", revision: { increment: 1 } }, select: invoiceFields });
      return { status: 200, invoice: serializeInvoice(cancelled), journal: { id: entry.id, number, date: input.data.date } } as const;
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ invoice: result.invoice, journal: result.journal }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isTransactionConflict(error) || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) return Response.json({ error: "تغییر هم‌زمان رخ داد؛ وضعیت فاکتور را دوباره بررسی کنید." }, { status: 409 });
    console.error("Invoice cancellation failed", error);
    return Response.json({ error: "ابطال فاکتور انجام نشد." }, { status: 500 });
  }
}
