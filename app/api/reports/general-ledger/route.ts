import { z } from "zod";
import { guardOrganizationRead, organizationContext, organizationContextError } from "@/lib/organization-context";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const member = await organizationContext(request, 403).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  const search = new URL(request.url).searchParams;
  const params = z.object({ fiscalYearId: z.string().cuid(), accountId: z.string().cuid() }).safeParse({ fiscalYearId: search.get("fiscalYearId"), accountId: search.get("accountId") });
  if (!params.success) return Response.json({ error: "سال مالی و حساب معتبر انتخاب کنید." }, { status: 400 });
  try {
    const report = await prisma.$transaction(async (tx) => {
      await guardOrganizationRead(tx, member);
      const [year, account] = await Promise.all([
        tx.fiscalYear.findFirst({ where: { id: params.data.fiscalYearId, organizationId: member.organizationId }, select: { id: true, name: true, startDate: true, endDate: true, status: true } }),
        tx.ledgerAccount.findFirst({ where: { id: params.data.accountId, organizationId: member.organizationId }, select: { id: true, name: true, code: true, type: true, isActive: true } }),
      ]);
      if (!year || !account) return null;
      const lines = await tx.journalLine.findMany({ where: { organizationId: member.organizationId, accountId: account.id, entry: { organizationId: member.organizationId, fiscalYearId: year.id, status: "POSTED" } }, orderBy: [{ entry: { date: "asc" } }, { entry: { number: "asc" } }, { id: "asc" }], select: { id: true, debit: true, credit: true, description: true, entry: { select: { id: true, number: true, date: true, description: true } } } });
      let debitTotal = 0n, creditTotal = 0n, balance = 0n;
      const rows = lines.map((line) => {
        const debit = BigInt(line.debit.toFixed(0));
        const credit = BigInt(line.credit.toFixed(0));
        debitTotal += debit; creditTotal += credit; balance += debit - credit;
        return { id: line.id, entry: line.entry, description: line.description, debit: debit.toString(), credit: credit.toString(), debitBalance: (balance > 0n ? balance : 0n).toString(), creditBalance: (balance < 0n ? -balance : 0n).toString() };
      });
      return { fiscalYear: year, account, rows, totals: { debit: debitTotal.toString(), credit: creditTotal.toString(), debitBalance: (balance > 0n ? balance : 0n).toString(), creditBalance: (balance < 0n ? -balance : 0n).toString() } };
    }, { isolationLevel: "RepeatableRead" });
    if (!report) return Response.json({ error: "حساب یا سال مالی پیدا نشد." }, { status: 404 });
    return Response.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    console.error("General ledger report failed", error);
    return Response.json({ error: "دریافت دفتر کل انجام نشد." }, { status: 500 });
  }
}
