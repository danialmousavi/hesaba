import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { guardOrganizationRead, organizationContext, organizationContextError } from "@/lib/organization-context";
import { prisma } from "@/lib/prisma";

const dateSchema = z.iso.date().refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
});
const querySchema = z.strictObject({
  fiscalYearId: z.string().cuid(), customerId: z.string().cuid().optional(),
  from: dateSchema.optional(), to: dateSchema.optional(), asOf: dateSchema.optional(),
  paymentStatus: z.enum(["all", "unpaid", "partial", "paid"]).default("all"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

type Row = { id: string; number: number; date: Date; customerId: string; customerName: string; journalEntryId: string; subtotal: string; discount: string; tax: string; amount: string; paid: string; remaining: string; paymentStatus: string };
type Totals = { count: string; subtotal: string; discount: string; tax: string; amount: string; paid: string; remaining: string; invalid: string };

export async function GET(request: Request) {
  const member = await organizationContext(request).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some((key) => params.getAll(key).length !== 1)) return Response.json({ error: "پارامتر تکراری معتبر نیست." }, { status: 400 });
  const parsed = querySchema.safeParse(Object.fromEntries(params.entries()));
  if (!parsed.success) return Response.json({ error: "پارامترهای گزارش معتبر نیستند." }, { status: 400 });
  const { fiscalYearId, customerId, page, pageSize, paymentStatus } = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      await guardOrganizationRead(tx, member);
      const year = await tx.fiscalYear.findFirst({ where: { id: fiscalYearId, organizationId: member.organizationId }, select: { id: true, name: true, startDate: true, endDate: true, status: true } });
      if (!year) return { error: "سال مالی پیدا نشد.", status: 404 } as const;
      if (customerId && !await tx.party.findFirst({ where: { id: customerId, organizationId: member.organizationId, isCustomer: true }, select: { id: true } })) return { error: "مشتری پیدا نشد.", status: 404 } as const;
      const start = year.startDate.toISOString().slice(0, 10), end = year.endDate.toISOString().slice(0, 10);
      const from = parsed.data.from ?? start, to = parsed.data.to ?? end, asOf = parsed.data.asOf ?? end;
      if (from < start || to > end || from > to || asOf < to) return { error: "بازه صدور باید در سال مالی باشد و تاریخ گزارش نباید پیش از پایان بازه باشد.", status: 400 } as const;
      const base = Prisma.sql`
        WITH invoice_amounts AS (
          SELECT l."organizationId", l."invoiceId", COUNT(*) AS line_count,
            SUM(ROUND(l.quantity * l."unitPrice")) AS subtotal,
            SUM(l."discountAmount") AS discount, SUM(l."taxAmount") AS tax,
            SUM(ROUND(l.quantity * l."unitPrice") - l."discountAmount" + l."taxAmount") AS amount
          FROM "InvoiceLine" l WHERE l."organizationId" = ${member.organizationId}
          GROUP BY l."organizationId", l."invoiceId"
        ), payments AS (
          SELECT a."organizationId", a."invoiceId", SUM(a.amount) AS paid
          FROM "PaymentAllocation" a JOIN "Payment" p ON p."organizationId" = a."organizationId" AND p.id = a."paymentId"
          WHERE a."organizationId" = ${member.organizationId} AND p.status = 'POSTED' AND p.type = 'RECEIPT' AND p.date <= ${asOf}::date
          GROUP BY a."organizationId", a."invoiceId"
        ), invoices AS (
          SELECT i.id, i.number, i.date, i."customerId", i."customerName", i."journalEntryId",
            COALESCE(a.subtotal, 0) AS subtotal, COALESCE(a.discount, 0) AS discount, COALESCE(a.tax, 0) AS tax,
            COALESCE(a.amount, 0) AS amount, COALESCE(p.paid, 0) AS paid,
            COALESCE(a.amount, 0) - COALESCE(p.paid, 0) AS remaining,
            (a.line_count IS NULL OR a.amount <= 0 OR COALESCE(p.paid, 0) > a.amount) AS invalid
          FROM "Invoice" i
          LEFT JOIN invoice_amounts a ON a."organizationId" = i."organizationId" AND a."invoiceId" = i.id
          LEFT JOIN payments p ON p."organizationId" = i."organizationId" AND p."invoiceId" = i.id
          LEFT JOIN "InvoiceCancellation" c ON c."organizationId" = i."organizationId" AND c."invoiceId" = i.id
          LEFT JOIN "JournalEntry" r ON r."organizationId" = c."organizationId" AND r.id = c."reversalEntryId"
          WHERE i."organizationId" = ${member.organizationId} AND i."fiscalYearId" = ${year.id}
            AND i.date BETWEEN ${from}::date AND ${to}::date
            AND (i.status = 'ISSUED' OR (i.status = 'CANCELLED' AND r.date > ${asOf}::date))
            ${customerId ? Prisma.sql`AND i."customerId" = ${customerId}` : Prisma.empty}
        ), filtered AS (
          SELECT *, CASE WHEN paid = 0 THEN 'unpaid' WHEN remaining = 0 THEN 'paid' ELSE 'partial' END AS "paymentStatus" FROM invoices
        )`;
      const statusFilter = paymentStatus === "all" ? Prisma.empty : Prisma.sql`WHERE "paymentStatus" = ${paymentStatus}`;
      const totals = await tx.$queryRaw<Totals[]>`${base} SELECT COUNT(*)::text AS count, COALESCE(SUM(subtotal),0)::text AS subtotal, COALESCE(SUM(discount),0)::text AS discount, COALESCE(SUM(tax),0)::text AS tax, COALESCE(SUM(amount),0)::text AS amount, COALESCE(SUM(paid),0)::text AS paid, COALESCE(SUM(remaining),0)::text AS remaining, (SELECT COUNT(*)::text FROM invoices WHERE invalid) AS invalid FROM filtered ${statusFilter}`;
      if (totals[0].invalid !== "0") throw new Error("Invalid invoice amounts or allocations in sales report");
      const rows = await tx.$queryRaw<Row[]>`${base} SELECT id, number, date, "customerId", "customerName", "journalEntryId", subtotal::text, discount::text, tax::text, amount::text, paid::text, remaining::text, "paymentStatus" FROM filtered ${statusFilter} ORDER BY date DESC, number DESC, id DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
      const { count, subtotal, discount, tax, amount, paid, remaining } = totals[0];
      const amounts = { subtotal, discount, tax, amount, paid, remaining };
      return { fiscalYear: { ...year, startDate: start, endDate: end }, filters: { from, to, asOf, customerId: customerId ?? null, paymentStatus }, scope: "INVOICES_ISSUED_IN_PERIOD_AS_OF_DATE", totals: { count, ...amounts }, rows: rows.map((row) => ({ ...row, date: row.date.toISOString().slice(0, 10) })), page, pageSize } as const;
    }, { isolationLevel: "RepeatableRead" });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    console.error("Sales report failed", error);
    return Response.json({ error: "دریافت گزارش فروش انجام نشد." }, { status: 500 });
  }
}
