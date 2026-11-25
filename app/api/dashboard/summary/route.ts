import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true } });
  if (!member) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 403 });
  const yearId = z.string().cuid().safeParse(new URL(request.url).searchParams.get("fiscalYearId"));
  if (!yearId.success) return Response.json({ error: "سال مالی معتبر انتخاب کنید." }, { status: 400 });
  try {
    const summary = await prisma.$transaction(async (tx) => {
      const year = await tx.fiscalYear.findFirst({ where: { id: yearId.data, organizationId: member.organizationId }, select: { id: true, name: true, startDate: true, endDate: true, status: true } });
      if (!year) return null;
      const [revenue, expense, counts, recent] = await Promise.all([
        tx.journalLine.aggregate({ where: { organizationId: member.organizationId, entry: { organizationId: member.organizationId, fiscalYearId: year.id, status: "POSTED", kind: { not: "CLOSING_TEMPORARY" } }, account: { organizationId: member.organizationId, type: "REVENUE" } }, _sum: { debit: true, credit: true } }),
        tx.journalLine.aggregate({ where: { organizationId: member.organizationId, entry: { organizationId: member.organizationId, fiscalYearId: year.id, status: "POSTED", kind: { not: "CLOSING_TEMPORARY" } }, account: { organizationId: member.organizationId, type: "EXPENSE" } }, _sum: { debit: true, credit: true } }),
        tx.journalEntry.groupBy({ by: ["status"], where: { organizationId: member.organizationId, fiscalYearId: year.id }, _count: { _all: true } }),
        tx.journalEntry.findMany({ where: { organizationId: member.organizationId, fiscalYearId: year.id, status: "POSTED" }, orderBy: [{ date: "desc" }, { number: "desc" }], take: 5, select: { id: true, number: true, date: true, description: true } }),
      ]);
      const integer = (value: { toFixed(dp: number): string } | null) => BigInt(value?.toFixed(0) ?? "0");
      const revenueNet = integer(revenue._sum.credit) - integer(revenue._sum.debit);
      const expenseNet = integer(expense._sum.debit) - integer(expense._sum.credit);
      return { fiscalYear: year, revenue: revenueNet.toString(), expenses: expenseNet.toString(), profit: (revenueNet - expenseNet).toString(), postedCount: counts.find((count) => count.status === "POSTED")?._count._all ?? 0, draftCount: counts.find((count) => count.status === "DRAFT")?._count._all ?? 0, recentPosted: recent };
    }, { isolationLevel: "RepeatableRead" });
    if (!summary) return Response.json({ error: "سال مالی پیدا نشد." }, { status: 404 });
    return Response.json(summary, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Dashboard summary failed", error);
    return Response.json({ error: "دریافت خلاصهٔ داشبورد انجام نشد." }, { status: 500 });
  }
}
