import { z } from "zod";
import { organizationContext, organizationContextError } from "@/lib/organization-context";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const member = await organizationContext(request).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  const params = new URL(request.url).searchParams;
  const cashIds = params.getAll("cashAccountId");
  if ([...params.keys()].some((key) => key !== "fiscalYearId" && key !== "cashAccountId") || params.getAll("fiscalYearId").length !== 1 || cashIds.length > 100 || new Set(cashIds).size !== cashIds.length || cashIds.some((id) => !z.string().cuid().safeParse(id).success)) return Response.json({ error: "پارامترهای شاخص معتبر نیستند." }, { status: 400 });
  const yearId = z.string().cuid().safeParse(params.get("fiscalYearId"));
  if (!yearId.success) return Response.json({ error: "سال مالی معتبر انتخاب کنید." }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const year = await tx.fiscalYear.findFirst({ where: { id: yearId.data, organizationId: member.organizationId }, select: { id: true, name: true, status: true, startDate: true, endDate: true } });
      if (!year) return { status: 404, error: "سال مالی پیدا نشد." } as const;
      const [links, cashAccounts, customersWithoutAccount, suppliersWithoutAccount, openingCount] = await Promise.all([
        tx.partyAccount.findMany({ where: { organizationId: member.organizationId }, select: { accountId: true, purpose: true } }),
        tx.ledgerAccount.findMany({ where: { organizationId: member.organizationId, id: { in: cashIds }, type: "ASSET", children: { none: {} }, partyLinks: { none: {} } }, orderBy: [{ code: "asc" }, { id: "asc" }], select: { id: true, code: true, name: true, isActive: true } }),
        tx.party.count({ where: { organizationId: member.organizationId, isCustomer: true, accountLinks: { none: { purpose: "RECEIVABLE" } } } }),
        tx.party.count({ where: { organizationId: member.organizationId, isSupplier: true, accountLinks: { none: { purpose: "PAYABLE" } } } }),
        tx.journalEntry.count({ where: { organizationId: member.organizationId, fiscalYearId: year.id, status: "POSTED", kind: "OPENING" } }),
      ]);
      if (cashAccounts.length !== cashIds.length) return { status: 400, error: "حساب نقدی باید دارایی بدون زیرحساب و بدون اتصال شخص در سازمان باشد." } as const;
      const ids = [...new Set([...links.map((link) => link.accountId), ...cashIds])];
      const movements = ids.length ? await tx.journalLine.groupBy({ by: ["accountId"], where: { organizationId: member.organizationId, accountId: { in: ids }, entry: { organizationId: member.organizationId, fiscalYearId: year.id, status: "POSTED", date: { lte: year.endDate }, kind: { not: "CLOSING_PERMANENT" } } }, _sum: { debit: true, credit: true } }) : [];
      const netByAccount = new Map(movements.map((row) => [row.accountId, BigInt(row._sum.debit?.toFixed(0) ?? "0") - BigInt(row._sum.credit?.toFixed(0) ?? "0")]));
      let receivables = 0n, customerCredits = 0n, payables = 0n, supplierAdvances = 0n;
      for (const link of links) {
        const net = netByAccount.get(link.accountId) ?? 0n;
        if (link.purpose === "RECEIVABLE") { if (net > 0n) receivables += net; else customerCredits -= net; }
        else { if (net < 0n) payables -= net; else supplierAdvances += net; }
      }
      const cashRows = cashAccounts.map((account) => ({ ...account, net: (netByAccount.get(account.id) ?? 0n).toString() }));
      const cashNet = cashRows.reduce((sum, row) => sum + BigInt(row.net), 0n);
      return { status: 200, data: {
        fiscalYear: { ...year, startDate: year.startDate.toISOString().slice(0, 10), endDate: year.endDate.toISOString().slice(0, 10) },
        scope: "FISCAL_YEAR_POSTED_BEFORE_PERMANENT_CLOSING", asOf: year.endDate.toISOString().slice(0, 10),
        receivables: { debitBalance: receivables.toString(), creditBalance: customerCredits.toString(), linkedAccounts: links.filter((link) => link.purpose === "RECEIVABLE").length, partiesWithoutAccount: customersWithoutAccount },
        payables: { creditBalance: payables.toString(), debitBalance: supplierAdvances.toString(), linkedAccounts: links.filter((link) => link.purpose === "PAYABLE").length, partiesWithoutAccount: suppliersWithoutAccount },
        cash: { selected: cashRows.length > 0, net: cashRows.length ? cashNet.toString() : null, accounts: cashRows },
        systemOpeningRecorded: openingCount > 0,
      } } as const;
    }, { isolationLevel: "RepeatableRead" });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result.data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Dashboard balances failed", error);
    return Response.json({ error: "دریافت شاخص‌های مانده انجام نشد." }, { status: 500 });
  }
}
