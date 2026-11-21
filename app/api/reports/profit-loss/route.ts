import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true } });
  if (!member) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 403 });
  const parsed = z.string().cuid().safeParse(new URL(request.url).searchParams.get("fiscalYearId"));
  if (!parsed.success) return Response.json({ error: "سال مالی معتبر انتخاب کنید." }, { status: 400 });
  try {
    const report = await prisma.$transaction(async (tx) => {
      const year = await tx.fiscalYear.findFirst({ where: { id: parsed.data, organizationId: member.organizationId }, select: { id: true, name: true, startDate: true, endDate: true, status: true } });
      if (!year) return null;
      const totals = await tx.journalLine.groupBy({ by: ["accountId"], where: { organizationId: member.organizationId, entry: { organizationId: member.organizationId, fiscalYearId: year.id, status: "POSTED" }, account: { organizationId: member.organizationId, type: { in: ["REVENUE", "EXPENSE"] } } }, _sum: { debit: true, credit: true } });
      const accounts = await tx.ledgerAccount.findMany({ where: { organizationId: member.organizationId, id: { in: totals.map((item) => item.accountId) } }, select: { id: true, code: true, name: true, type: true } });
      const byId = new Map(accounts.map((account) => [account.id, account]));
      let revenue = 0n, expenses = 0n;
      const rows = totals.map((item) => {
        const account = byId.get(item.accountId);
        if (!account || (account.type !== "REVENUE" && account.type !== "EXPENSE")) throw new Error("Profit and loss account missing");
        const debit = BigInt(item._sum.debit?.toFixed(0) ?? "0"), credit = BigInt(item._sum.credit?.toFixed(0) ?? "0");
        const net = account.type === "REVENUE" ? credit - debit : debit - credit;
        if (account.type === "REVENUE") revenue += net; else expenses += net;
        return { ...account, debit: debit.toString(), credit: credit.toString(), net: net.toString() };
      }).sort((a, b) => a.code.localeCompare(b.code, "en"));
      return { fiscalYear: year, rows, totals: { revenue: revenue.toString(), expenses: expenses.toString(), profit: (revenue - expenses).toString() } };
    }, { isolationLevel: "RepeatableRead" });
    if (!report) return Response.json({ error: "سال مالی پیدا نشد." }, { status: 404 });
    return Response.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Profit and loss report failed", error);
    return Response.json({ error: "دریافت سود و زیان انجام نشد." }, { status: 500 });
  }
}
