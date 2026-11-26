import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { lockFinancialAccounts } from "@/lib/financial-accounts";
import { isTransactionConflict } from "@/lib/prisma-errors";
import { financialTransactionInput } from "@/lib/financial-transaction-input";
import { guardOrganizationWrite, organizationContext, organizationContextError } from "@/lib/organization-context";

const querySchema = z.object({
  fiscalYearId: z.string().cuid().optional(),
  type: z.enum(["all", "income", "expense"]).default("all"),
  search: z.string().trim().max(150).default(""),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const fields = { id: true, fiscalYearId: true, type: true, status: true, date: true, amount: true, description: true, paymentMethod: true, categoryAccountId: true, settlementAccountId: true, journalEntryId: true, createdAt: true, updatedAt: true, fiscalYear: { select: { name: true, status: true } }, categoryAccount: { select: { code: true, name: true } }, settlementAccount: { select: { code: true, name: true } } } as const;

export async function GET(request: Request) {
  const member = await organizationContext(request).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) return Response.json({ error: "پارامترهای جست‌وجو معتبر نیستند." }, { status: 400 });
  const { fiscalYearId, type, search, page, pageSize } = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      if (fiscalYearId && !await tx.fiscalYear.findFirst({ where: { id: fiscalYearId, organizationId: member.organizationId }, select: { id: true } })) return null;
      const where: Prisma.FinancialTransactionWhereInput = { organizationId: member.organizationId, status: "DRAFT", ...(fiscalYearId ? { fiscalYearId } : {}), ...(type === "all" ? {} : { type: type === "income" ? "INCOME" : "EXPENSE" }), ...(search ? { description: { contains: search, mode: "insensitive" } } : {}) };
      const [transactions, total] = await Promise.all([
        tx.financialTransaction.findMany({ where, select: fields, orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
        tx.financialTransaction.count({ where }),
      ]);
      return { transactions, total, page, pageSize };
    }, { isolationLevel: "RepeatableRead" });
    if (!result) return Response.json({ error: "سال مالی پیدا نشد." }, { status: 404 });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Financial draft list failed", error);
    return Response.json({ error: "دریافت پیش‌نویس‌های درآمد و هزینه انجام نشد." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const member = await organizationContext(request).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  if (member.role === "VIEWER") return Response.json({ error: "نقش مشاهده‌گر اجازه ثبت پیش‌نویس ندارد." }, { status: 403 });
  const parsed = financialTransactionInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "اطلاعات معتبر نیست." }, { status: 400 });
  const date = new Date(`${parsed.data.date}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== parsed.data.date) return Response.json({ error: "تاریخ معتبر نیست." }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      await guardOrganizationWrite(tx, member, request, ["ADMIN", "ACCOUNTANT"]);
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${parsed.data.fiscalYearId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const year = await tx.fiscalYear.findFirst({ where: { id: parsed.data.fiscalYearId, organizationId: member.organizationId, status: "OPEN", startDate: { lte: date }, endDate: { gte: date } }, select: { id: true } });
      if (!year) return null;
      const ids = await lockFinancialAccounts(tx, member.organizationId, parsed.data.type, parsed.data.categoryAccountId, parsed.data.settlementAccountId);
      if (!ids) return null;
      return tx.financialTransaction.create({ data: { ...parsed.data, date, organizationId: member.organizationId }, select: fields });
    }, { isolationLevel: "Serializable" });
    if (!result) return Response.json({ error: "سال مالی، تاریخ یا حساب‌ها معتبر و فعال نیستند؛ حساب‌ها باید بدون زیرحساب و متناسب با نوع رویداد باشند و حساب تسویه نباید به شخص اختصاص داشته باشد." }, { status: 400 });
    return Response.json({ transaction: result }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    if (isTransactionConflict(error)) return Response.json({ error: "تغییر هم‌زمان رخ داد؛ دوباره تلاش کنید." }, { status: 409 });
    console.error("Financial draft creation failed", error);
    return Response.json({ error: "ثبت پیش‌نویس درآمد و هزینه انجام نشد." }, { status: 500 });
  }
}
