import { organizationContext, organizationContextError } from "@/lib/organization-context";
import { prisma } from "@/lib/prisma";
import { dashboardDateRange, parseDashboardFilters } from "@/lib/dashboard-date-range";

export async function GET(request: Request) {
  const member = await organizationContext(request, 403).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  const filters = parseDashboardFilters(new URL(request.url).searchParams);
  if (!filters) return Response.json({ error: "سال مالی و بازه زمانی معتبر انتخاب کنید." }, { status: 400 });
  try {
    const summary = await prisma.$transaction(async (tx) => {
      const year = await tx.fiscalYear.findFirst({ where: { id: filters.fiscalYearId, organizationId: member.organizationId }, select: { id: true, name: true, startDate: true, endDate: true, status: true } });
      if (!year) return null;
      const range = dashboardDateRange(filters, year);
      if (!range) return { invalidRange: true } as const;
      const date = { gte: range.startDate, lte: range.endDate };
      const [revenue, expense, counts, recent] = await Promise.all([
        tx.journalLine.aggregate({ where: { organizationId: member.organizationId, entry: { organizationId: member.organizationId, fiscalYearId: year.id, date, status: "POSTED", kind: { not: "CLOSING_TEMPORARY" } }, account: { organizationId: member.organizationId, type: "REVENUE" } }, _sum: { debit: true, credit: true } }),
        tx.journalLine.aggregate({ where: { organizationId: member.organizationId, entry: { organizationId: member.organizationId, fiscalYearId: year.id, date, status: "POSTED", kind: { not: "CLOSING_TEMPORARY" } }, account: { organizationId: member.organizationId, type: "EXPENSE" } }, _sum: { debit: true, credit: true } }),
        tx.journalEntry.groupBy({ by: ["status"], where: { organizationId: member.organizationId, fiscalYearId: year.id, date }, _count: { _all: true } }),
        tx.journalEntry.findMany({ where: { organizationId: member.organizationId, fiscalYearId: year.id, date, status: "POSTED" }, orderBy: [{ date: "desc" }, { number: "desc" }], take: 5, select: { id: true, number: true, date: true, description: true } }),
      ]);
      const integer = (value: { toFixed(dp: number): string } | null) => BigInt(value?.toFixed(0) ?? "0");
      const revenueNet = integer(revenue._sum.credit) - integer(revenue._sum.debit);
      const expenseNet = integer(expense._sum.debit) - integer(expense._sum.credit);
      return { fiscalYear: year, range: { from: range.from, to: range.to }, revenue: revenueNet.toString(), expenses: expenseNet.toString(), profit: (revenueNet - expenseNet).toString(), postedCount: counts.find((count) => count.status === "POSTED")?._count._all ?? 0, draftCount: counts.find((count) => count.status === "DRAFT")?._count._all ?? 0, recentPosted: recent };
    }, { isolationLevel: "RepeatableRead" });
    if (!summary) return Response.json({ error: "سال مالی پیدا نشد." }, { status: 404 });
    if ("invalidRange" in summary) return Response.json({ error: "بازه باید در محدوده سال مالی باشد." }, { status: 400 });
    return Response.json(summary, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Dashboard summary failed", error);
    return Response.json({ error: "دریافت خلاصهٔ داشبورد انجام نشد." }, { status: 500 });
  }
}
