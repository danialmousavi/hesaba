import { createHash } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { invoiceMembership } from "@/lib/invoice-api";
import { lockJournalAccounts, markPartyAccountsUsed } from "@/lib/journal-account-locks";
import { prisma } from "@/lib/prisma";
import { isTransactionConflict } from "@/lib/prisma-errors";
import { receiptFields, serializeReceipt } from "@/lib/receipt-api";

const schema = z.strictObject({
  requestKey: z.uuid().transform((value) => value.toLowerCase()), fiscalYearId: z.string().cuid(), partyId: z.string().cuid(),
  date: z.iso.date(), amount: z.string().regex(/^[1-9]\d{0,19}$/), method: z.enum(["CASH", "BANK_TRANSFER", "OTHER"]),
  settlementAccountId: z.string().cuid(), description: z.string().trim().max(500).nullable().optional(),
});
const querySchema = z.strictObject({ page: z.coerce.number().int().min(1).max(10000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25) });

export async function GET(request: Request) {
  const member = await invoiceMembership(request);
  if (!member) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!query.success) return Response.json({ error: "پارامترهای فهرست معتبر نیستند." }, { status: 400 });
  try {
    const { page, pageSize } = query.data;
    const where = { organizationId: member.organizationId, type: "PAYMENT" as const, status: "POSTED" as const };
    const [payments, total] = await prisma.$transaction([
      prisma.payment.findMany({ where, select: receiptFields, orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
      prisma.payment.count({ where }),
    ], { isolationLevel: "RepeatableRead" });
    return Response.json({ payments: payments.map(serializeReceipt), total, page, pageSize }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Supplier payment list failed", error);
    return Response.json({ error: "دریافت فهرست پرداخت‌ها انجام نشد." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await invoiceMembership(request);
  if (!member || member.role === "VIEWER") return Response.json({ error: "اجازه ثبت پرداخت ندارید." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "اطلاعات پرداخت معتبر نیست." }, { status: 400 });
  const input = parsed.data;
  const date = new Date(`${input.date}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== input.date) return Response.json({ error: "تاریخ معتبر نیست." }, { status: 400 });
  const hash = createHash("sha256").update(JSON.stringify({ type: "PAYMENT", fiscalYearId: input.fiscalYearId, partyId: input.partyId, date: input.date, amount: input.amount, method: input.method, settlementAccountId: input.settlementAccountId, description: input.description || null })).digest("hex");
  try {
    const result = await prisma.$transaction(async (tx) => {
      const prior = await tx.payment.findUnique({ where: { organizationId_requestKey: { organizationId: member.organizationId, requestKey: input.requestKey } }, select: { requestHash: true, ...receiptFields } });
      if (prior) return prior.type === "PAYMENT" && prior.requestHash === hash ? { payment: prior, replay: true } as const : { status: 409, error: "این شناسه درخواست قبلاً برای اطلاعات دیگری استفاده شده است." } as const;
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${input.fiscalYearId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const year = await tx.fiscalYear.findFirst({ where: { id: input.fiscalYearId, organizationId: member.organizationId, status: "OPEN", startDate: { lte: date }, endDate: { gte: date } }, select: { id: true } });
      if (!year) return { status: 400, error: "سال مالی باز یا تاریخ معتبر نیست." } as const;
      const link = await tx.partyAccount.findFirst({ where: { organizationId: member.organizationId, partyId: input.partyId, purpose: "PAYABLE" }, select: { accountId: true } });
      if (!link || link.accountId === input.settlementAccountId) return { status: 409, error: "حساب پرداختنی تأمین‌کننده یا حساب تسویه معتبر نیست." } as const;
      const accountIds = [link.accountId, input.settlementAccountId];
      if (!await lockJournalAccounts(tx, member.organizationId, accountIds)) return { status: 409, error: "حساب یا تأمین‌کننده معتبر و فعال نیست." } as const;
      const supplier = await tx.party.findFirst({ where: { id: input.partyId, organizationId: member.organizationId, isActive: true, isSupplier: true }, select: { name: true } });
      const currentLink = await tx.partyAccount.findFirst({ where: { organizationId: member.organizationId, partyId: input.partyId, purpose: "PAYABLE", accountId: link.accountId }, select: { id: true } });
      const accounts = await tx.ledgerAccount.findMany({ where: { organizationId: member.organizationId, id: { in: accountIds } }, select: { id: true, type: true, children: { select: { id: true }, take: 1 }, partyLinks: { select: { id: true }, take: 1 } } });
      const payable = accounts.find((account) => account.id === link.accountId), settlement = accounts.find((account) => account.id === input.settlementAccountId);
      if (!supplier || !currentLink || payable?.type !== "LIABILITY" || payable.children.length || settlement?.type !== "ASSET" || settlement.children.length || settlement.partyLinks.length) return { status: 409, error: "تأمین‌کننده یا حساب‌های پرداختنی و تسویه معتبر نیستند." } as const;
      const max = await tx.journalEntry.aggregate({ where: { organizationId: member.organizationId, fiscalYearId: year.id }, _max: { number: true } });
      const number = (max._max.number ?? 0) + 1;
      if (number > 2147483647) return { status: 409, error: "شماره سند جدید در دسترس نیست." } as const;
      const payment = await tx.payment.create({ data: { organizationId: member.organizationId, fiscalYearId: year.id, partyId: input.partyId, type: "PAYMENT", date, amount: input.amount, method: input.method, settlementAccountId: input.settlementAccountId, description: input.description || null }, select: { id: true } });
      const entry = await tx.journalEntry.create({ data: { organizationId: member.organizationId, fiscalYearId: year.id, number, date, description: `پرداخت به ${supplier.name}`, lines: { create: [{ accountId: link.accountId, debit: input.amount, credit: "0" }, { accountId: input.settlementAccountId, debit: "0", credit: input.amount }] } }, select: { id: true } });
      await markPartyAccountsUsed(tx, member.organizationId, accountIds);
      await tx.journalEntry.update({ where: { id: entry.id }, data: { status: "POSTED" } });
      await tx.journalEvent.create({ data: { organizationId: member.organizationId, entryId: entry.id, actorId: session.user.id, actorName: session.user.name, action: "POSTED" } });
      const posted = await tx.payment.update({ where: { id: payment.id }, data: { status: "POSTED", requestKey: input.requestKey, requestHash: hash, journalEntryId: entry.id }, select: receiptFields });
      return { payment: posted, replay: false } as const;
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ payment: serializeReceipt(result.payment), replay: result.replay }, { status: result.replay ? 200 : 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isTransactionConflict(error) || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      const prior = await prisma.payment.findUnique({ where: { organizationId_requestKey: { organizationId: member.organizationId, requestKey: input.requestKey } }, select: { requestHash: true, ...receiptFields } });
      if (prior?.type === "PAYMENT" && prior.requestHash === hash) return Response.json({ payment: serializeReceipt(prior), replay: true }, { headers: { "Cache-Control": "no-store" } });
      return Response.json({ error: prior ? "این شناسه درخواست قبلاً برای اطلاعات دیگری استفاده شده است." : "تغییر هم‌زمان رخ داد؛ دوباره بررسی کنید." }, { status: 409 });
    }
    console.error("Supplier payment creation failed", error);
    return Response.json({ error: "ثبت پرداخت انجام نشد." }, { status: 500 });
  }
}
