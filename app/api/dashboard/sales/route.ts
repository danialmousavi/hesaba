import { z } from "zod";
import { invoiceMembership } from "@/lib/invoice-api";
import { prisma } from "@/lib/prisma";

const persianDate = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", { year: "numeric", month: "numeric", timeZone: "UTC" });
type Day = { date: Date; count: string; amount: string; invalid: string };

export async function GET(request: Request) {
  const member = await invoiceMembership(request);
  if (!member) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some((key) => key !== "fiscalYearId" || params.getAll(key).length !== 1)) return Response.json({ error: "پارامترهای داشبورد معتبر نیستند." }, { status: 400 });
  const yearId = z.string().cuid().safeParse(params.get("fiscalYearId"));
  if (!yearId.success) return Response.json({ error: "سال مالی معتبر انتخاب کنید." }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const year = await tx.fiscalYear.findFirst({ where: { id: yearId.data, organizationId: member.organizationId }, select: { id: true, name: true, status: true, startDate: true, endDate: true } });
      if (!year) return null;
      const days = await tx.$queryRaw<Day[]>`
        WITH amounts AS (
          SELECT l."organizationId", l."invoiceId", COUNT(*) AS line_count,
            SUM(ROUND(l.quantity * l."unitPrice") - l."discountAmount" + l."taxAmount") AS amount
          FROM "InvoiceLine" l WHERE l."organizationId" = ${member.organizationId}
          GROUP BY l."organizationId", l."invoiceId"
        )
        SELECT i.date, COUNT(*)::text AS count, COALESCE(SUM(a.amount), 0)::text AS amount,
          COUNT(*) FILTER (WHERE a.line_count IS NULL OR a.amount <= 0)::text AS invalid
        FROM "Invoice" i
        LEFT JOIN amounts a ON a."organizationId" = i."organizationId" AND a."invoiceId" = i.id
        LEFT JOIN "InvoiceCancellation" c ON c."organizationId" = i."organizationId" AND c."invoiceId" = i.id
        LEFT JOIN "JournalEntry" r ON r."organizationId" = c."organizationId" AND r.id = c."reversalEntryId"
        WHERE i."organizationId" = ${member.organizationId} AND i."fiscalYearId" = ${year.id}
          AND i.date BETWEEN ${year.startDate}::date AND ${year.endDate}::date
          AND (i.status = 'ISSUED' OR (i.status = 'CANCELLED' AND r.date > ${year.endDate}::date))
        GROUP BY i.date ORDER BY i.date`;
      const months = new Map<string, { year: number; month: number; count: bigint; amount: bigint }>();
      let count = 0n, amount = 0n;
      for (const day of days) {
        if (day.invalid !== "0") throw new Error("Invalid invoice amounts in dashboard sales");
        const parts = persianDate.formatToParts(day.date);
        const persianYear = Number(parts.find((part) => part.type === "year")?.value);
        const persianMonth = Number(parts.find((part) => part.type === "month")?.value);
        const key = `${persianYear}-${String(persianMonth).padStart(2, "0")}`;
        const item = months.get(key) ?? { year: persianYear, month: persianMonth, count: 0n, amount: 0n };
        item.count += BigInt(day.count); item.amount += BigInt(day.amount); months.set(key, item);
        count += BigInt(day.count); amount += BigInt(day.amount);
      }
      return { fiscalYear: { ...year, startDate: year.startDate.toISOString().slice(0, 10), endDate: year.endDate.toISOString().slice(0, 10) }, scope: "INVOICES_ISSUED_IN_FISCAL_YEAR_AS_OF_YEAR_END", totals: { count: count.toString(), amount: amount.toString() }, months: Array.from(months.values(), (item) => ({ ...item, count: item.count.toString(), amount: item.amount.toString() })) };
    }, { isolationLevel: "RepeatableRead" });
    if (!result) return Response.json({ error: "سال مالی پیدا نشد." }, { status: 404 });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Dashboard sales failed", error);
    return Response.json({ error: "دریافت آمار فروش داشبورد انجام نشد." }, { status: 500 });
  }
}
