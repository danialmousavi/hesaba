import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { invoiceFields, invoiceInputSchema, invoiceLineInputSchema, invoiceMembership, serializeInvoice } from "@/lib/invoice-api";
import { calculateInvoice, InvoiceCalculationError } from "@/lib/invoice-calculation";
import { prisma } from "@/lib/prisma";
import { isTransactionConflict } from "@/lib/prisma-errors";

const editSchema = invoiceInputSchema.omit({ fiscalYearId: true, lines: true }).extend({
  revision: z.number().int().min(0).max(2147483646),
  lines: z.array(invoiceLineInputSchema.extend({ id: z.string().cuid().optional() })).min(1).max(100),
}).refine((input) => {
  const ids = input.lines.flatMap((line) => line.id ? [line.id] : []);
  return new Set(ids).size === ids.length;
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await invoiceMembership(request);
  if (!member) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });
  const id = z.string().cuid().safeParse((await params).id);
  if (!id.success) return Response.json({ error: "شناسه فاکتور معتبر نیست." }, { status: 400 });
  try {
    const invoice = await prisma.invoice.findFirst({ where: { id: id.data, organizationId: member.organizationId, status: "DRAFT" }, select: invoiceFields });
    if (!invoice) return Response.json({ error: "فاکتور پیدا نشد." }, { status: 404 });
    return Response.json({ invoice: serializeInvoice(invoice) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Invoice lookup failed", error);
    return Response.json({ error: "دریافت فاکتور انجام نشد." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const member = await invoiceMembership(request);
  if (!member) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });
  if (member.role === "VIEWER") return Response.json({ error: "نقش مشاهده‌گر اجازه ویرایش فاکتور ندارد." }, { status: 403 });
  const id = z.string().cuid().safeParse((await params).id);
  if (!id.success) return Response.json({ error: "شناسه فاکتور معتبر نیست." }, { status: 400 });
  const parsed = editSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "اطلاعات فاکتور معتبر نیست." }, { status: 400 });
  const input = parsed.data;
  const date = new Date(`${input.date}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== input.date) return Response.json({ error: "تاریخ معتبر نیست." }, { status: 400 });
  try {
    calculateInvoice(input.lines);
    const result = await prisma.$transaction(async (tx) => {
      const initial = await tx.invoice.findFirst({ where: { id: id.data, organizationId: member.organizationId, status: "DRAFT" }, select: { fiscalYearId: true } });
      if (!initial) return { error: "فاکتور پیدا نشد.", status: 404 } as const;
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${initial.fiscalYearId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const year = await tx.fiscalYear.findFirst({ where: { id: initial.fiscalYearId, organizationId: member.organizationId, status: "OPEN", startDate: { lte: date }, endDate: { gte: date } }, select: { id: true } });
      if (!year) return { error: "سال مالی بسته است یا تاریخ در محدوده آن نیست.", status: 400 } as const;
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${id.data} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const existing = await tx.invoice.findFirst({ where: { id: id.data, organizationId: member.organizationId, fiscalYearId: year.id, status: "DRAFT" }, select: invoiceFields });
      if (!existing) return { error: "فاکتور پیدا نشد.", status: 404 } as const;
      if (existing.revision !== input.revision) return { error: "فاکتور تغییر کرده است؛ پیش از ویرایش دوباره آن را بارگذاری کنید.", status: 409 } as const;
      const oldLines = new Map(existing.lines.map((line) => [line.id, line]));
      if (input.lines.some((line) => line.id && (!oldLines.has(line.id) || oldLines.get(line.id)?.productId !== line.productId))) return { error: "شناسه قلم یا کالای مرتبط معتبر نیست.", status: 400 } as const;
      await tx.$queryRaw`SELECT id FROM "Party" WHERE id = ${input.customerId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const customer = await tx.party.findFirst({ where: { id: input.customerId, organizationId: member.organizationId, isCustomer: true, isActive: true }, select: { id: true, name: true } });
      if (!customer) return { error: "مشتری معتبر و فعال نیست.", status: 400 } as const;
      const productIds = [...new Set(input.lines.map((line) => line.productId))].sort();
      await tx.$queryRaw`SELECT id FROM "Product" WHERE "organizationId" = ${member.organizationId} AND id IN (${Prisma.join(productIds)}) ORDER BY id FOR UPDATE`;
      const products = await tx.product.findMany({ where: { organizationId: member.organizationId, id: { in: productIds }, isActive: true }, select: { id: true, code: true, name: true, type: true, unit: true } });
      if (products.length !== productIds.length) return { error: "کالا یا خدمت معتبر و فعال نیست.", status: 400 } as const;
      const productMap = new Map(products.map((product) => [product.id, product]));
      await tx.invoiceLine.deleteMany({ where: { organizationId: member.organizationId, invoiceId: existing.id } });
      await tx.invoiceLine.createMany({ data: input.lines.map((line, index) => {
        const product = productMap.get(line.productId)!;
        const old = line.id ? oldLines.get(line.id) : undefined;
        return { ...(line.id ? { id: line.id } : {}), organizationId: member.organizationId, invoiceId: existing.id, productId: product.id, position: index + 1,
          productCode: old?.productCode ?? product.code, productName: old?.productName ?? product.name, productType: old?.productType ?? product.type, unit: old?.unit ?? product.unit,
          quantity: line.quantity, unitPrice: line.unitPrice, discountAmount: line.discountAmount, taxAmount: line.taxAmount };
      }) });
      const invoice = await tx.invoice.update({ where: { id: existing.id }, data: { customerId: customer.id, customerName: existing.customerId === customer.id ? existing.customerName : customer.name, date, description: input.description || null, revision: { increment: 1 } }, select: invoiceFields });
      return { invoice } as const;
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ invoice: serializeInvoice(result.invoice) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof InvoiceCalculationError) return Response.json({ error: "تعداد یا مبالغ فاکتور معتبر نیستند؛ تخفیف نباید از مبلغ قلم بیشتر باشد." }, { status: 400 });
    if (isTransactionConflict(error)) return Response.json({ error: "تغییر هم‌زمان رخ داد؛ فاکتور را دوباره بارگذاری کنید." }, { status: 409 });
    console.error("Invoice update failed", error);
    return Response.json({ error: "ویرایش پیش‌نویس فاکتور انجام نشد." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const member = await invoiceMembership(request);
  if (!member) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });
  if (member.role === "VIEWER") return Response.json({ error: "نقش مشاهده‌گر اجازه حذف فاکتور ندارد." }, { status: 403 });
  const id = z.string().cuid().safeParse((await params).id);
  if (!id.success) return Response.json({ error: "شناسه فاکتور معتبر نیست." }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({ where: { id: id.data, organizationId: member.organizationId, status: "DRAFT" }, select: { fiscalYearId: true } });
      if (!invoice) return "missing" as const;
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${invoice.fiscalYearId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const year = await tx.fiscalYear.findFirst({ where: { id: invoice.fiscalYearId, organizationId: member.organizationId, status: "OPEN" }, select: { id: true } });
      if (!year) return "closed" as const;
      const deleted = await tx.invoice.deleteMany({ where: { id: id.data, organizationId: member.organizationId, status: "DRAFT" } });
      return deleted.count ? "deleted" as const : "missing" as const;
    }, { isolationLevel: "Serializable" });
    if (result === "missing") return Response.json({ error: "فاکتور پیدا نشد." }, { status: 404 });
    if (result === "closed") return Response.json({ error: "سال مالی بسته است." }, { status: 409 });
    return Response.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isTransactionConflict(error)) return Response.json({ error: "تغییر هم‌زمان رخ داد؛ دوباره تلاش کنید." }, { status: 409 });
    console.error("Invoice deletion failed", error);
    return Response.json({ error: "حذف پیش‌نویس فاکتور انجام نشد." }, { status: 500 });
  }
}
