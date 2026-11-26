import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { organizationContext, organizationContextError } from "@/lib/organization-context";
import { prisma } from "@/lib/prisma";

const querySchema = z.strictObject({
  fiscalYearId: z.string().cuid(),
  search: z.string().trim().max(150).default(""),
  role: z.enum(["all", "customer", "supplier"]).default("all"),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(request: Request) {
  const member = await organizationContext(request).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) return Response.json({ error: "پارامترهای گزارش معتبر نیستند." }, { status: 400 });
  const { fiscalYearId, search, role, status, page, pageSize } = parsed.data;
  try {
    const report = await prisma.$transaction(async (tx) => {
      const year = await tx.fiscalYear.findFirst({ where: { id: fiscalYearId, organizationId: member.organizationId }, select: { id: true, name: true, startDate: true, endDate: true, status: true } });
      if (!year) return null;
      const where: Prisma.PartyWhereInput = {
        organizationId: member.organizationId,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        ...(role === "customer" ? { isCustomer: true } : role === "supplier" ? { isSupplier: true } : {}),
        ...(status === "all" ? {} : { isActive: status === "active" }),
      };
      const [parties, total] = await Promise.all([
        tx.party.findMany({ where, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize, select: { id: true, name: true, isCustomer: true, isSupplier: true, isActive: true, accountLinks: { select: { purpose: true, account: { select: { id: true, code: true, name: true, isActive: true } } } } } }),
        tx.party.count({ where }),
      ]);
      const accountIds = parties.flatMap((party) => party.accountLinks.map((link) => link.account.id));
      const movements = accountIds.length ? await tx.journalLine.groupBy({ by: ["accountId"], where: { organizationId: member.organizationId, accountId: { in: accountIds }, entry: { organizationId: member.organizationId, fiscalYearId: year.id, status: "POSTED" } }, _sum: { debit: true, credit: true } }) : [];
      const movementsByAccount = new Map(movements.map((movement) => [movement.accountId, movement]));
      const rows = parties.map(({ accountLinks, ...party }) => {
        function balance(purpose: "RECEIVABLE" | "PAYABLE") {
          const link = accountLinks.find((item) => item.purpose === purpose);
          if (!link) return null;
          const movement = movementsByAccount.get(link.account.id);
          const debit = BigInt(movement?._sum.debit?.toFixed(0) ?? "0"), credit = BigInt(movement?._sum.credit?.toFixed(0) ?? "0");
          const net = debit - credit;
          return { account: link.account, debit: debit.toString(), credit: credit.toString(), net: net.toString(), debitBalance: (net > 0n ? net : 0n).toString(), creditBalance: (net < 0n ? -net : 0n).toString() };
        }
        return { ...party, receivable: balance("RECEIVABLE"), payable: balance("PAYABLE") };
      });
      return { fiscalYear: { ...year, startDate: year.startDate.toISOString().slice(0, 10), endDate: year.endDate.toISOString().slice(0, 10) }, scope: "FISCAL_YEAR_POSTED_MOVEMENT", rows, total, page, pageSize };
    }, { isolationLevel: "RepeatableRead" });
    if (!report) return Response.json({ error: "سال مالی پیدا نشد." }, { status: 404 });
    return Response.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Party balances report failed", error);
    return Response.json({ error: "دریافت گزارش مانده اشخاص انجام نشد." }, { status: 500 });
  }
}
