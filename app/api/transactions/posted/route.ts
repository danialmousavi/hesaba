import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { guardOrganizationRead, organizationContext, organizationContextError } from "@/lib/organization-context";
import { prisma } from "@/lib/prisma";

const integer = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(10000));
const query = z.strictObject({
  fiscalYearId: z.string().cuid().optional(),
  type: z.enum(["all", "income", "expense"]).default("all"),
  search: z.string().trim().max(150).default(""),
  page: integer.default(1),
  pageSize: integer.pipe(z.number().max(100)).default(25),
});

export async function GET(request: Request) {
  const member = await organizationContext(request, 403).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some((key) => params.getAll(key).length !== 1)) return Response.json({ error: "پارامترهای جست‌وجو معتبر نیستند." }, { status: 400 });
  const parsed = query.safeParse(Object.fromEntries(params));
  if (!parsed.success) return Response.json({ error: "پارامترهای جست‌وجو معتبر نیستند." }, { status: 400 });
  const { fiscalYearId, type, search, page, pageSize } = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      await guardOrganizationRead(tx, member);
      if (fiscalYearId && !await tx.fiscalYear.findFirst({ where: { id: fiscalYearId, organizationId: member.organizationId }, select: { id: true } })) return null;
      const where: Prisma.FinancialTransactionWhereInput = { organizationId: member.organizationId, status: "POSTED", ...(fiscalYearId ? { fiscalYearId } : {}), ...(type === "all" ? {} : { type: type === "income" ? "INCOME" : "EXPENSE" }), ...(search ? { description: { contains: search, mode: "insensitive" } } : {}) };
      const [transactions, total] = await Promise.all([
        tx.financialTransaction.findMany({ where, orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize, select: { id: true, fiscalYearId: true, type: true, status: true, date: true, amount: true, description: true, paymentMethod: true, fiscalYear: { select: { name: true, status: true } }, categoryAccount: { select: { code: true, name: true } }, settlementAccount: { select: { code: true, name: true } }, journalEntry: { select: { id: true, number: true, status: true } } } }),
        tx.financialTransaction.count({ where }),
      ]);
      return { transactions, total, page, pageSize };
    }, { isolationLevel: "RepeatableRead" });
    if (!result) return Response.json({ error: "سال مالی پیدا نشد." }, { status: 404 });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    console.error("Posted financial transaction list failed", error);
    return Response.json({ error: "دریافت درآمد و هزینه‌های ثبت‌شده انجام نشد." }, { status: 500 });
  }
}
