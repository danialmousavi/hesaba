import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true } });
  if (!member) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const parsed = z.string().cuid().safeParse(params.get("fiscalYearId"));
  if (!parsed.success) return Response.json({ error: "سال مالی معتبر انتخاب کنید." }, { status: 400 });
  const beforeClosing = z.enum(["true", "false"]).default("false").safeParse(params.get("beforeClosing") ?? undefined);
  if (!beforeClosing.success) return Response.json({ error: "پارامتر نمایش تراز معتبر نیست." }, { status: 400 });
  try {
    const report = await prisma.$transaction(async (tx) => {
      const year = await tx.fiscalYear.findFirst({ where: { id: parsed.data, organizationId: member.organizationId }, select: { id: true, name: true, startDate: true, endDate: true, status: true } });
      if (!year) return null;
      const totals = await tx.journalLine.groupBy({
        by: ["accountId"],
        where: { organizationId: member.organizationId, entry: { organizationId: member.organizationId, fiscalYearId: year.id, status: "POSTED", ...(beforeClosing.data === "true" ? { kind: { notIn: ["CLOSING_TEMPORARY", "CLOSING_PERMANENT"] } } : {}) } },
        _sum: { debit: true, credit: true },
      });
      const accounts = await tx.ledgerAccount.findMany({ where: { organizationId: member.organizationId, id: { in: totals.map((item) => item.accountId) } }, select: { id: true, code: true, name: true, type: true, parentId: true } });
      const byId = new Map(accounts.map((account) => [account.id, account]));
      let totalDebit = 0n, totalCredit = 0n, totalDebitBalance = 0n, totalCreditBalance = 0n;
      const rows = totals.map((item) => {
        const account = byId.get(item.accountId);
        if (!account) throw new Error("Journal line account missing");
        const debit = BigInt(item._sum.debit?.toFixed(0) ?? "0");
        const credit = BigInt(item._sum.credit?.toFixed(0) ?? "0");
        const balance = debit - credit;
        const debitBalance = balance > 0n ? balance : 0n;
        const creditBalance = balance < 0n ? -balance : 0n;
        totalDebit += debit; totalCredit += credit; totalDebitBalance += debitBalance; totalCreditBalance += creditBalance;
        return { ...account, debit: debit.toString(), credit: credit.toString(), debitBalance: debitBalance.toString(), creditBalance: creditBalance.toString() };
      }).sort((a, b) => a.code.localeCompare(b.code, "en"));
      return { fiscalYear: year, beforeClosing: beforeClosing.data === "true", rows, totals: { debit: totalDebit.toString(), credit: totalCredit.toString(), debitBalance: totalDebitBalance.toString(), creditBalance: totalCreditBalance.toString() } };
    }, { isolationLevel: "RepeatableRead" });
    if (!report) return Response.json({ error: "سال مالی پیدا نشد." }, { status: 404 });
    return Response.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Trial balance report failed", error);
    return Response.json({ error: "دریافت تراز آزمایشی انجام نشد." }, { status: 500 });
  }
}
