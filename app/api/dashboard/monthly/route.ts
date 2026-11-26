import { organizationContext, organizationContextError } from "@/lib/organization-context";
import { prisma } from "@/lib/prisma";
import { dashboardDateRange, parseDashboardFilters } from "@/lib/dashboard-date-range";

const persianDate = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
  year: "numeric", month: "numeric", timeZone: "UTC",
});

type DailyTotals = { date: Date; revenue: string; expenses: string };

export async function GET(request: Request) {
  const member = await organizationContext(request, 403).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  const filters = parseDashboardFilters(new URL(request.url).searchParams);
  if (!filters) return Response.json({ error: "سال مالی و بازه زمانی معتبر انتخاب کنید." }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const fiscalYear = await tx.fiscalYear.findFirst({
        where: { id: filters.fiscalYearId, organizationId: member.organizationId },
        select: { id: true, name: true, startDate: true, endDate: true },
      });
      if (!fiscalYear) return null;
      const range = dashboardDateRange(filters, fiscalYear);
      if (!range) return { invalidRange: true } as const;
      const days = await tx.$queryRaw<DailyTotals[]>`
        SELECT e.date,
          COALESCE(SUM(CASE WHEN a.type = 'REVENUE' THEN l.credit - l.debit ELSE 0 END), 0)::text AS revenue,
          COALESCE(SUM(CASE WHEN a.type = 'EXPENSE' THEN l.debit - l.credit ELSE 0 END), 0)::text AS expenses
        FROM "JournalLine" l
        JOIN "JournalEntry" e ON e.id = l."entryId" AND e."organizationId" = l."organizationId"
        JOIN "LedgerAccount" a ON a.id = l."accountId" AND a."organizationId" = l."organizationId"
        WHERE l."organizationId" = ${member.organizationId} AND e."fiscalYearId" = ${fiscalYear.id}
          AND e.date BETWEEN ${range.startDate}::date AND ${range.endDate}::date
          AND e.status = 'POSTED' AND e.kind <> 'CLOSING_TEMPORARY' AND a.type IN ('REVENUE', 'EXPENSE')
        GROUP BY e.date ORDER BY e.date`;
      const months = new Map<string, { year: number; month: number; revenue: bigint; expenses: bigint }>();
      for (const day of days) {
        const parts = persianDate.formatToParts(day.date);
        const year = Number(parts.find((part) => part.type === "year")?.value);
        const month = Number(parts.find((part) => part.type === "month")?.value);
        const key = `${year}-${String(month).padStart(2, "0")}`;
        const current = months.get(key) ?? { year, month, revenue: 0n, expenses: 0n };
        current.revenue += BigInt(day.revenue);
        current.expenses += BigInt(day.expenses);
        months.set(key, current);
      }
      return { fiscalYear, range: { from: range.from, to: range.to }, months: Array.from(months.values(), (item) => ({ ...item, revenue: item.revenue.toString(), expenses: item.expenses.toString() })) };
    }, { isolationLevel: "RepeatableRead" });
    if (!result) return Response.json({ error: "سال مالی پیدا نشد." }, { status: 404 });
    if ("invalidRange" in result) return Response.json({ error: "بازه باید در محدوده سال مالی باشد." }, { status: 400 });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Dashboard monthly totals failed", error);
    return Response.json({ error: "دریافت عملکرد ماهانه انجام نشد." }, { status: 500 });
  }
}
