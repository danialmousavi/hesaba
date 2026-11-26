import { z } from "zod";
import { invoiceFields, serializeInvoice } from "@/lib/invoice-api";
import { createInvoicePdf, PdfUnavailableError } from "@/lib/invoice-pdf";
import { prisma } from "@/lib/prisma";
import { organizationContext, organizationContextError } from "@/lib/organization-context";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await organizationContext(request, 403).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  const id = z.string().cuid().safeParse((await params).id);
  if (!id.success) return Response.json({ error: "شناسه فاکتور معتبر نیست." }, { status: 400 });
  try {
    const invoice = await prisma.invoice.findFirst({ where: { id: id.data, organizationId: member.organizationId }, select: { ...invoiceFields, organization: { select: { name: true } } } });
    if (!invoice) return Response.json({ error: "فاکتور پیدا نشد." }, { status: 404 });
    const pdf = await createInvoicePdf(serializeInvoice(invoice), invoice.organization.name);
    return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="invoice-${invoice.number ?? "draft"}-${invoice.id}.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    if (error instanceof PdfUnavailableError) return Response.json({ error: error.message }, { status: 503, headers: { "Cache-Control": "no-store" } });
    console.error("Invoice PDF failed", error);
    return Response.json({ error: "ساخت فایل PDF فاکتور انجام نشد." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
