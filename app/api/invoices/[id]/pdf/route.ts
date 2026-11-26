import { z } from "zod";
import { auth } from "@/lib/auth";
import { invoiceFields, invoiceMembership, serializeInvoice } from "@/lib/invoice-api";
import { createInvoicePdf, PdfUnavailableError } from "@/lib/invoice-pdf";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await invoiceMembership(request);
  if (!member) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 403 });
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
