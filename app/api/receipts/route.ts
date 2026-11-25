import { createHash } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { calculateInvoice } from "@/lib/invoice-calculation";
import { invoiceMembership } from "@/lib/invoice-api";
import { lockJournalAccounts, markPartyAccountsUsed } from "@/lib/journal-account-locks";
import { prisma } from "@/lib/prisma";
import { isTransactionConflict } from "@/lib/prisma-errors";
import { receiptFields, serializeReceipt } from "@/lib/receipt-api";

const positiveAmount = z.string().regex(/^[1-9]\d{0,19}$/);
const schema = z.strictObject({
  requestKey: z.uuid().transform((value) => value.toLowerCase()), fiscalYearId: z.string().cuid(), partyId: z.string().cuid(),
  date: z.iso.date(), amount: positiveAmount, method: z.enum(["CASH", "BANK_TRANSFER", "OTHER"]),
  settlementAccountId: z.string().cuid(), description: z.string().trim().max(500).nullable().optional(),
  allocations: z.array(z.strictObject({ invoiceId: z.string().cuid(), amount: positiveAmount })).min(1).max(100),
}).refine((value) => new Set(value.allocations.map((item) => item.invoiceId)).size === value.allocations.length);

const querySchema = z.strictObject({ page: z.coerce.number().int().min(1).max(10000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25) });

export async function GET(request: Request) {
  const member = await invoiceMembership(request);
  if (!member) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!query.success) return Response.json({ error: "پارامترهای فهرست معتبر نیستند." }, { status: 400 });
  try {
    const { page, pageSize } = query.data;
    const where = { organizationId: member.organizationId, type: "RECEIPT" as const, status: "POSTED" as const };
    const [receipts, total] = await prisma.$transaction([
      prisma.payment.findMany({ where, select: receiptFields, orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
      prisma.payment.count({ where }),
    ], { isolationLevel: "RepeatableRead" });
    return Response.json({ receipts: receipts.map(serializeReceipt), total, page, pageSize }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Receipt list failed", error);
    return Response.json({ error: "دریافت فهرست دریافت‌ها انجام نشد." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await invoiceMembership(request);
  if (!member || member.role === "VIEWER") return Response.json({ error: "اجازه ثبت دریافت ندارید." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "اطلاعات دریافت معتبر نیست." }, { status: 400 });
  const input = parsed.data;
  const date = new Date(`${input.date}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== input.date) return Response.json({ error: "تاریخ معتبر نیست." }, { status: 400 });
  if (input.allocations.reduce((sum, item) => sum + BigInt(item.amount), 0n) !== BigInt(input.amount)) return Response.json({ error: "جمع تخصیص‌ها باید برابر مبلغ دریافت باشد." }, { status: 400 });
  const allocations = [...input.allocations].sort((a, b) => a.invoiceId.localeCompare(b.invoiceId));
  const hash = createHash("sha256").update(JSON.stringify({ fiscalYearId: input.fiscalYearId, partyId: input.partyId, date: input.date, amount: input.amount, method: input.method, settlementAccountId: input.settlementAccountId, description: input.description || null, allocations })).digest("hex");
  try {
    const result = await prisma.$transaction(async (tx) => {
      const prior = await tx.payment.findUnique({ where: { organizationId_requestKey: { organizationId: member.organizationId, requestKey: input.requestKey } }, select: { requestHash: true, ...receiptFields } });
      if (prior) return prior.requestHash === hash ? { receipt: prior, replay: true } as const : { status: 409, error: "این شناسه درخواست قبلاً برای اطلاعات دیگری استفاده شده است." } as const;
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${input.fiscalYearId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const year = await tx.fiscalYear.findFirst({ where: { id: input.fiscalYearId, organizationId: member.organizationId, status: "OPEN", startDate: { lte: date }, endDate: { gte: date } }, select: { id: true } });
      if (!year) return { status: 400, error: "سال مالی باز یا تاریخ معتبر نیست." } as const;
      const invoiceIds = allocations.map((item) => item.invoiceId);
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE "organizationId" = ${member.organizationId} AND id IN (${Prisma.join(invoiceIds)}) ORDER BY id FOR UPDATE`;
      const invoices = await tx.invoice.findMany({ where: { organizationId: member.organizationId, customerId: input.partyId, status: "ISSUED", id: { in: invoiceIds } }, select: { id: true, date: true, lines: { select: { quantity: true, unitPrice: true, discountAmount: true, taxAmount: true } } } });
      if (invoices.length !== invoiceIds.length || invoices.some((invoice) => invoice.date > date)) return { status: 400, error: "فاکتور صادرشده مشتری یا تاریخ تخصیص معتبر نیست." } as const;
      const link = await tx.partyAccount.findFirst({ where: { organizationId: member.organizationId, partyId: input.partyId, purpose: "RECEIVABLE" }, select: { accountId: true } });
      if (!link || link.accountId === input.settlementAccountId) return { status: 409, error: "حساب دریافتنی مشتری یا حساب تسویه معتبر نیست." } as const;
      const accountIds = [link.accountId, input.settlementAccountId];
      if (!await lockJournalAccounts(tx, member.organizationId, accountIds)) return { status: 409, error: "حساب یا مشتری معتبر و فعال نیست." } as const;
      const customer = await tx.party.findFirst({ where: { id: input.partyId, organizationId: member.organizationId, isActive: true, isCustomer: true }, select: { name: true } });
      const currentLink = await tx.partyAccount.findFirst({ where: { organizationId: member.organizationId, partyId: input.partyId, purpose: "RECEIVABLE", accountId: link.accountId }, select: { id: true } });
      const accounts = await tx.ledgerAccount.findMany({ where: { organizationId: member.organizationId, id: { in: accountIds } }, select: { id: true, type: true, children: { select: { id: true }, take: 1 }, partyLinks: { select: { id: true }, take: 1 } } });
      const receivable = accounts.find((account) => account.id === link.accountId), settlement = accounts.find((account) => account.id === input.settlementAccountId);
      if (!customer || !currentLink || receivable?.type !== "ASSET" || receivable.children.length || settlement?.type !== "ASSET" || settlement.children.length || settlement.partyLinks.length) return { status: 409, error: "مشتری یا حساب‌های دریافتنی و تسویه معتبر نیستند." } as const;
      const paid = await tx.paymentAllocation.groupBy({ by: ["invoiceId"], where: { organizationId: member.organizationId, invoiceId: { in: invoiceIds }, payment: { status: "POSTED", type: "RECEIPT" } }, _sum: { amount: true } });
      const paidByInvoice = new Map(paid.map((item) => [item.invoiceId, BigInt(item._sum.amount?.toFixed(0) ?? "0")]));
      for (const allocation of allocations) {
        const invoice = invoices.find((item) => item.id === allocation.invoiceId)!;
        const total = BigInt(calculateInvoice(invoice.lines.map((line) => ({ quantity: line.quantity.toFixed(3), unitPrice: line.unitPrice.toFixed(0), discountAmount: line.discountAmount.toFixed(0), taxAmount: line.taxAmount.toFixed(0) }))).totals.total);
        if ((paidByInvoice.get(invoice.id) ?? 0n) + BigInt(allocation.amount) > total) return { status: 409, error: "مبلغ تخصیص از مانده فاکتور بیشتر است؛ فهرست را به‌روز کنید." } as const;
      }
      const max = await tx.journalEntry.aggregate({ where: { organizationId: member.organizationId, fiscalYearId: year.id }, _max: { number: true } });
      const number = (max._max.number ?? 0) + 1;
      if (number > 2147483647) return { status: 409, error: "شماره سند جدید در دسترس نیست." } as const;
      const payment = await tx.payment.create({ data: { organizationId: member.organizationId, fiscalYearId: year.id, partyId: input.partyId, type: "RECEIPT", date, amount: input.amount, method: input.method, settlementAccountId: input.settlementAccountId, description: input.description || null }, select: { id: true } });
      await tx.paymentAllocation.createMany({ data: allocations.map((item) => ({ organizationId: member.organizationId, partyId: input.partyId, paymentId: payment.id, invoiceId: item.invoiceId, amount: item.amount })) });
      const entry = await tx.journalEntry.create({ data: { organizationId: member.organizationId, fiscalYearId: year.id, number, date, description: `دریافت از ${customer.name}`, lines: { create: [{ accountId: input.settlementAccountId, debit: input.amount, credit: "0" }, { accountId: link.accountId, debit: "0", credit: input.amount }] } }, select: { id: true } });
      await markPartyAccountsUsed(tx, member.organizationId, accountIds);
      await tx.journalEntry.update({ where: { id: entry.id }, data: { status: "POSTED" } });
      await tx.journalEvent.create({ data: { organizationId: member.organizationId, entryId: entry.id, actorId: session.user.id, actorName: session.user.name, action: "POSTED" } });
      const receipt = await tx.payment.update({ where: { id: payment.id }, data: { status: "POSTED", requestKey: input.requestKey, requestHash: hash, journalEntryId: entry.id }, select: receiptFields });
      return { receipt, replay: false } as const;
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ receipt: serializeReceipt(result.receipt), replay: result.replay }, { status: result.replay ? 200 : 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isTransactionConflict(error) || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      const prior = await prisma.payment.findUnique({ where: { organizationId_requestKey: { organizationId: member.organizationId, requestKey: input.requestKey } }, select: { requestHash: true, ...receiptFields } });
      if (prior && prior.requestHash === hash) return Response.json({ receipt: serializeReceipt(prior), replay: true }, { headers: { "Cache-Control": "no-store" } });
      return Response.json({ error: prior ? "این شناسه درخواست قبلاً برای اطلاعات دیگری استفاده شده است." : "تغییر هم‌زمان رخ داد؛ مانده فاکتور را دوباره بررسی کنید." }, { status: 409 });
    }
    console.error("Receipt creation failed", error);
    return Response.json({ error: "ثبت دریافت انجام نشد." }, { status: 500 });
  }
}
