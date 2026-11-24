import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { calculateInvoice } from "@/lib/invoice-calculation";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const invoiceLineInputSchema = z.strictObject({
  productId: z.string().cuid(), quantity: z.string().max(19), unitPrice: z.string().max(20),
  discountAmount: z.string().max(20), taxAmount: z.string().max(20),
});
export const invoiceInputSchema = z.strictObject({
  fiscalYearId: z.string().cuid(), customerId: z.string().cuid(), date: z.iso.date(),
  description: z.string().trim().max(500).nullable().optional(),
  lines: z.array(invoiceLineInputSchema).min(1).max(100),
});

export async function invoiceMembership(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  return prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true } });
}

export const invoiceFields = {
  id: true, fiscalYearId: true, customerId: true, customerName: true, date: true,
  status: true, description: true, revision: true, createdAt: true, updatedAt: true,
  lines: { orderBy: { position: "asc" }, select: { id: true, position: true, productId: true, productCode: true, productName: true, productType: true, unit: true, quantity: true, unitPrice: true, discountAmount: true, taxAmount: true } },
} satisfies Prisma.InvoiceSelect;

type Invoice = Prisma.InvoiceGetPayload<{ select: typeof invoiceFields }>;

export function serializeInvoice(invoice: Invoice) {
  const lines = invoice.lines.map((line) => ({ ...line, quantity: line.quantity.toFixed(3), unitPrice: line.unitPrice.toFixed(0), discountAmount: line.discountAmount.toFixed(0), taxAmount: line.taxAmount.toFixed(0) }));
  const calculation = calculateInvoice(lines);
  return { ...invoice, date: invoice.date.toISOString().slice(0, 10), lines: lines.map((line, index) => ({ ...line, amounts: calculation.lines[index] })), totals: calculation.totals };
}
