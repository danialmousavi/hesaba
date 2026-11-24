import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { invoiceFields, invoiceInputSchema, invoiceMembership, serializeInvoice } from "@/lib/invoice-api";
import { calculateInvoice, InvoiceCalculationError } from "@/lib/invoice-calculation";
import { prisma } from "@/lib/prisma";
import { isTransactionConflict } from "@/lib/prisma-errors";

const querySchema = z.strictObject({
  fiscalYearId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(request: Request) {
  const member = await invoiceMembership(request);
  if (!member) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) return Response.json({ error: "پارامترهای فهرست معتبر نیستند." }, { status: 400 });
  const { fiscalYearId, page, pageSize } = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      if (fiscalYearId && !await tx.fiscalYear.findFirst({ where: { id: fiscalYearId, organizationId: member.organizationId }, select: { id: true } })) return null;
      const where: Prisma.InvoiceWhereInput = { organizationId: member.organizationId, status: "DRAFT", ...(fiscalYearId ? { fiscalYearId } : {}) };
      const [invoices, total] = await Promise.all([
        tx.invoice.findMany({ where, select: invoiceFields, orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
        tx.invoice.count({ where }),
      ]);
      return { invoices: invoices.map(serializeInvoice), total, page, pageSize };
    }, { isolationLevel: "RepeatableRead" });
    if (!result) return Response.json({ error: "سال مالی پیدا نشد." }, { status: 404 });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Invoice list failed", error);
    return Response.json({ error: "دریافت فهرست فاکتورها انجام نشد." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const member = await invoiceMembership(request);
  if (!member) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });
  if (member.role === "VIEWER") return Response.json({ error: "نقش مشاهده‌گر اجازه ثبت فاکتور ندارد." }, { status: 403 });
  const parsed = invoiceInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "اطلاعات فاکتور معتبر نیست." }, { status: 400 });
  const input = parsed.data;
  const date = new Date(`${input.date}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== input.date) return Response.json({ error: "تاریخ معتبر نیست." }, { status: 400 });
  try {
    calculateInvoice(input.lines);
    const invoice = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${input.fiscalYearId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const year = await tx.fiscalYear.findFirst({ where: { id: input.fiscalYearId, organizationId: member.organizationId, status: "OPEN", startDate: { lte: date }, endDate: { gte: date } }, select: { id: true } });
      if (!year) return null;
      await tx.$queryRaw`SELECT id FROM "Party" WHERE id = ${input.customerId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const customer = await tx.party.findFirst({ where: { id: input.customerId, organizationId: member.organizationId, isCustomer: true, isActive: true }, select: { id: true, name: true } });
      if (!customer) return null;
      const productIds = [...new Set(input.lines.map((line) => line.productId))].sort();
      await tx.$queryRaw`SELECT id FROM "Product" WHERE "organizationId" = ${member.organizationId} AND id IN (${Prisma.join(productIds)}) ORDER BY id FOR UPDATE`;
      const products = await tx.product.findMany({ where: { organizationId: member.organizationId, id: { in: productIds }, isActive: true }, select: { id: true, code: true, name: true, type: true, unit: true } });
      if (products.length !== productIds.length) return null;
      const productMap = new Map(products.map((product) => [product.id, product]));
      return tx.invoice.create({ data: {
        organizationId: member.organizationId, fiscalYearId: year.id, customerId: customer.id, customerName: customer.name,
        date, description: input.description || null,
        lines: { create: input.lines.map((line, index) => {
          const product = productMap.get(line.productId)!;
          return { productId: product.id, position: index + 1, productCode: product.code, productName: product.name, productType: product.type, unit: product.unit, quantity: line.quantity, unitPrice: line.unitPrice, discountAmount: line.discountAmount, taxAmount: line.taxAmount };
        }) },
      }, select: invoiceFields });
    }, { isolationLevel: "Serializable" });
    if (!invoice) return Response.json({ error: "سال مالی، تاریخ، مشتری یا کالا معتبر و فعال نیست." }, { status: 400 });
    return Response.json({ invoice: serializeInvoice(invoice) }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof InvoiceCalculationError) return Response.json({ error: "تعداد یا مبالغ فاکتور معتبر نیستند؛ تخفیف نباید از مبلغ قلم بیشتر باشد." }, { status: 400 });
    if (isTransactionConflict(error)) return Response.json({ error: "تغییر هم‌زمان رخ داد؛ دوباره تلاش کنید." }, { status: 409 });
    console.error("Invoice creation failed", error);
    return Response.json({ error: "ثبت پیش‌نویس فاکتور انجام نشد." }, { status: 500 });
  }
}
