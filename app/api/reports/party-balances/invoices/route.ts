import { z } from "zod";
import { calculateInvoice } from "@/lib/invoice-calculation";
import { guardOrganizationRead, organizationContext, organizationContextError } from "@/lib/organization-context";
import { prisma } from "@/lib/prisma";

const querySchema = z.strictObject({
  fiscalYearId: z.string().cuid(), partyId: z.string().cuid(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(request: Request) {
  const member = await organizationContext(request).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) return Response.json({ error: "پارامترهای گزارش معتبر نیستند." }, { status: 400 });
  const { fiscalYearId, partyId, page, pageSize } = parsed.data;
  try {
    const report = await prisma.$transaction(async (tx) => {
      await guardOrganizationRead(tx, member);
      const [year, party] = await Promise.all([
        tx.fiscalYear.findFirst({ where: { id: fiscalYearId, organizationId: member.organizationId }, select: { id: true, name: true, startDate: true, endDate: true, status: true } }),
        tx.party.findFirst({ where: { id: partyId, organizationId: member.organizationId }, select: { id: true, name: true, isCustomer: true, isSupplier: true, isActive: true } }),
      ]);
      if (!year || !party) return null;
      const where = { organizationId: member.organizationId, fiscalYearId: year.id, customerId: party.id, status: "ISSUED" as const };
      const [invoices, total] = await Promise.all([
        tx.invoice.findMany({ where, orderBy: [{ date: "desc" }, { number: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize, select: { id: true, number: true, date: true, journalEntryId: true, lines: { select: { quantity: true, unitPrice: true, discountAmount: true, taxAmount: true } } } }),
        tx.invoice.count({ where }),
      ]);
      const invoiceIds = invoices.map((invoice) => invoice.id);
      const payments = invoiceIds.length ? await tx.paymentAllocation.groupBy({ by: ["invoiceId"], where: { organizationId: member.organizationId, invoiceId: { in: invoiceIds }, payment: { organizationId: member.organizationId, status: "POSTED", type: "RECEIPT", date: { lte: year.endDate } } }, _sum: { amount: true } }) : [];
      const paidByInvoice = new Map(payments.map((payment) => [payment.invoiceId, BigInt(payment._sum.amount?.toFixed(0) ?? "0")]));
      const rows = invoices.map((invoice) => {
        const amount = BigInt(calculateInvoice(invoice.lines.map((line) => ({ quantity: line.quantity.toFixed(3), unitPrice: line.unitPrice.toFixed(0), discountAmount: line.discountAmount.toFixed(0), taxAmount: line.taxAmount.toFixed(0) }))).totals.total);
        const paid = paidByInvoice.get(invoice.id) ?? 0n;
        if (paid > amount) throw new Error("Posted allocations exceed invoice total");
        return { id: invoice.id, number: invoice.number, date: invoice.date.toISOString().slice(0, 10), journalEntryId: invoice.journalEntryId, amount: amount.toString(), paid: paid.toString(), remaining: (amount - paid).toString() };
      });
      return { fiscalYear: { ...year, startDate: year.startDate.toISOString().slice(0, 10), endDate: year.endDate.toISOString().slice(0, 10) }, party, scope: "INVOICES_ISSUED_IN_FISCAL_YEAR_AS_OF_YEAR_END", rows, total, page, pageSize };
    }, { isolationLevel: "RepeatableRead" });
    if (!report) return Response.json({ error: "سال مالی یا شخص پیدا نشد." }, { status: 404 });
    return Response.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    console.error("Party invoice balances report failed", error);
    return Response.json({ error: "دریافت گزارش فاکتورهای شخص انجام نشد." }, { status: 500 });
  }
}
