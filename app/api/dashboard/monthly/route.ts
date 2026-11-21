import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const persianDate = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
  year: "numeric", month: "numeric", timeZone: "UTC",
});

type DailyTotals = { date: Date; revenue: string; expenses: string };

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await prisma.membership.findFirst({
    where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true },
  });
  if (!member) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 403 });
  const yearId = z.string().cuid().safeParse(new URL(request.url).searchParams.get("fiscalYearId"));
  if (!yearId.success) return Response.json({ error: "سال مالی معتبر انتخاب کنید." }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const fiscalYear = await tx.fiscalYear.findFirst({
        where: { id: yearId.data, organizationId: member.organizationId },
        select: { id: true, name: true, startDate: true, endDate: true },
      });
      if (!fiscalYear) return null;
      const days = await tx.$queryRaw<DailyTotals[]>`
        SELECT e.date,
          COALESCE(SUM(CASE WHEN a.type = 'REVENUE' THEN l.credit - l.debit ELSE 0 END), 0)::text AS revenue,
          COALESCE(SUM(CASE WHEN a.type = 'EXPENSE' THEN l.debit - l.credit ELSE 0 END), 0)::text AS expenses
        FROM "JournalLine" l
        JOIN "JournalEntry" e ON e.id = l."entryId" AND e."organizationId" = l."organizationId"
        JOIN "LedgerAccount" a ON a.id = l."accountId" AND a."organizationId" = l."organizationId"
        WHERE l."organizationId" = ${member.organizationId} AND e."fiscalYearId" = ${fiscalYear.id}
          AND e.status = 'POSTED' AND a.type IN ('REVENUE', 'EXPENSE')
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
      return { fiscalYear, months: Array.from(months.values(), (item) => ({ ...item, revenue: item.revenue.toString(), expenses: item.expenses.toString() })) };
    }, { isolationLevel: "RepeatableRead" });
    if (!result) return Response.json({ error: "سال مالی پیدا نشد." }, { status: 404 });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Dashboard monthly totals failed", error);
    return Response.json({ error: "دریافت عملکرد ماهانه انجام نشد." }, { status: 500 });
  }
}
