import { z } from "zod";
import { guardOrganizationRead, organizationContext, organizationContextError } from "@/lib/organization-context";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const member = await organizationContext(request, 403).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  const parsed = z.string().cuid().safeParse(new URL(request.url).searchParams.get("fiscalYearId"));
  if (!parsed.success) return Response.json({ error: "سال مالی معتبر انتخاب کنید." }, { status: 400 });
  try {
    const report = await prisma.$transaction(async (tx) => {
      await guardOrganizationRead(tx, member);
      const year = await tx.fiscalYear.findFirst({ where: { id: parsed.data, organizationId: member.organizationId }, select: { id: true, name: true, startDate: true, endDate: true, status: true } });
      if (!year) return null;
      const totals = await tx.journalLine.groupBy({ by: ["accountId"], where: { organizationId: member.organizationId, entry: { organizationId: member.organizationId, fiscalYearId: year.id, status: "POSTED", kind: { not: "CLOSING_TEMPORARY" } }, account: { organizationId: member.organizationId, type: { in: ["REVENUE", "EXPENSE"] } } }, _sum: { debit: true, credit: true } });
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
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    console.error("Profit and loss report failed", error);
    return Response.json({ error: "دریافت سود و زیان انجام نشد." }, { status: 500 });
  }
}
