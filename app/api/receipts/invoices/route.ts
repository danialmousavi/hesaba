import { z } from "zod";
import { calculateInvoice } from "@/lib/invoice-calculation";
import { guardOrganizationRead, organizationContext, organizationContextError } from "@/lib/organization-context";
import { prisma } from "@/lib/prisma";

const querySchema = z.strictObject({
  partyId: z.string().cuid(), page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(request: Request) {
  const member = await organizationContext(request).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) return Response.json({ error: "پارامترهای جست‌وجو معتبر نیستند." }, { status: 400 });
  const { partyId, page, pageSize } = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      await guardOrganizationRead(tx, member);
      if (!await tx.party.findFirst({ where: { id: partyId, organizationId: member.organizationId, isCustomer: true }, select: { id: true } })) return null;
      const where = { organizationId: member.organizationId, customerId: partyId, status: "ISSUED" as const };
      const [invoices, total] = await Promise.all([
        tx.invoice.findMany({ where, orderBy: [{ date: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize, select: { id: true, number: true, date: true, fiscalYearId: true, lines: { select: { quantity: true, unitPrice: true, discountAmount: true, taxAmount: true } }, allocations: { where: { payment: { status: "POSTED", type: "RECEIPT" } }, select: { amount: true } } } }),
        tx.invoice.count({ where }),
      ]);
      return { invoices: invoices.map((invoice) => {
        const totalAmount = BigInt(calculateInvoice(invoice.lines.map((line) => ({ quantity: line.quantity.toFixed(3), unitPrice: line.unitPrice.toFixed(0), discountAmount: line.discountAmount.toFixed(0), taxAmount: line.taxAmount.toFixed(0) }))).totals.total);
        const paid = invoice.allocations.reduce((sum, allocation) => sum + BigInt(allocation.amount.toFixed(0)), 0n);
        if (paid > totalAmount) throw new Error("Posted allocations exceed invoice total");
        return { id: invoice.id, number: invoice.number, date: invoice.date.toISOString().slice(0, 10), fiscalYearId: invoice.fiscalYearId, total: totalAmount.toString(), paid: paid.toString(), remaining: (totalAmount - paid).toString() };
      }), total, page, pageSize };
    }, { isolationLevel: "RepeatableRead" });
    if (!result) return Response.json({ error: "مشتری پیدا نشد." }, { status: 404 });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    console.error("Receipt invoices failed", error);
    return Response.json({ error: "دریافت مانده فاکتورها انجام نشد." }, { status: 500 });
  }
}
