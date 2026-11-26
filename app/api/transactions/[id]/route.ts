import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTransactionConflict } from "@/lib/prisma-errors";
import { financialDraftEditInput } from "@/lib/financial-transaction-input";
import { lockFinancialAccounts } from "@/lib/financial-accounts";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true } });
  if (!member || member.role === "VIEWER") return Response.json({ error: "اجازه ویرایش پیش‌نویس ندارید." }, { status: 403 });
  const id = z.string().cuid().safeParse((await params).id);
  if (!id.success) return Response.json({ error: "شناسه پیش‌نویس معتبر نیست." }, { status: 400 });
  const parsed = financialDraftEditInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "اطلاعات معتبر نیست." }, { status: 400 });
  const date = new Date(`${parsed.data.date}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== parsed.data.date) return Response.json({ error: "تاریخ معتبر نیست." }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const initial = await tx.financialTransaction.findFirst({ where: { id: id.data, organizationId: member.organizationId }, select: { fiscalYearId: true } });
      if (!initial) return { status: 404, error: "پیش‌نویس پیدا نشد." } as const;
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${initial.fiscalYearId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "FinancialTransaction" WHERE id = ${id.data} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const record = await tx.financialTransaction.findFirst({ where: { id: id.data, organizationId: member.organizationId }, select: { status: true, fiscalYear: { select: { status: true, startDate: true, endDate: true } } } });
      if (!record) return { status: 404, error: "پیش‌نویس پیدا نشد." } as const;
      if (record.status !== "DRAFT") return { status: 409, error: "رویداد ثبت‌شده قابل ویرایش نیست." } as const;
      if (record.fiscalYear.status !== "OPEN") return { status: 409, error: "ویرایش پیش‌نویس در سال مالی بسته مجاز نیست." } as const;
      if (date < record.fiscalYear.startDate || date > record.fiscalYear.endDate) return { status: 400, error: "تاریخ باید در محدوده سال مالی باشد." } as const;
      const ids = await lockFinancialAccounts(tx, member.organizationId, parsed.data.type, parsed.data.categoryAccountId, parsed.data.settlementAccountId);
      if (!ids) return { status: 400, error: "حساب‌ها معتبر و فعال نیستند؛ حساب‌ها باید بدون زیرحساب و متناسب با نوع رویداد باشند و حساب تسویه نباید به شخص اختصاص داشته باشد." } as const;
      const updated = await tx.financialTransaction.update({ where: { id: id.data }, data: { ...parsed.data, date }, select: { id: true, fiscalYearId: true, type: true, status: true, date: true, amount: true, description: true, paymentMethod: true, categoryAccountId: true, settlementAccountId: true, journalEntryId: true, updatedAt: true } });
      return { status: 200, transaction: updated } as const;
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ transaction: result.transaction }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isTransactionConflict(error)) return Response.json({ error: "تغییر هم‌زمان رخ داد؛ دوباره تلاش کنید." }, { status: 409 });
    console.error("Financial draft update failed", error);
    return Response.json({ error: "ویرایش پیش‌نویس درآمد و هزینه انجام نشد." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true } });
  if (!member || member.role === "VIEWER") return Response.json({ error: "اجازه حذف پیش‌نویس ندارید." }, { status: 403 });
  const id = z.string().cuid().safeParse((await params).id);
  if (!id.success) return Response.json({ error: "شناسه پیش‌نویس معتبر نیست." }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const initial = await tx.financialTransaction.findFirst({ where: { id: id.data, organizationId: member.organizationId }, select: { fiscalYearId: true } });
      if (!initial) return { status: 404, error: "پیش‌نویس پیدا نشد." } as const;
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${initial.fiscalYearId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "FinancialTransaction" WHERE id = ${id.data} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const record = await tx.financialTransaction.findFirst({ where: { id: id.data, organizationId: member.organizationId }, select: { status: true, fiscalYear: { select: { status: true } } } });
      if (!record) return { status: 404, error: "پیش‌نویس پیدا نشد." } as const;
      if (record.status !== "DRAFT") return { status: 409, error: "رویداد ثبت‌شده قابل حذف نیست." } as const;
      if (record.fiscalYear.status !== "OPEN") return { status: 409, error: "حذف پیش‌نویس در سال مالی بسته مجاز نیست." } as const;
      await tx.financialTransaction.delete({ where: { id: id.data } });
      return { status: 200 } as const;
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isTransactionConflict(error)) return Response.json({ error: "تغییر هم‌زمان رخ داد؛ دوباره تلاش کنید." }, { status: 409 });
    console.error("Financial draft deletion failed", error);
    return Response.json({ error: "حذف پیش‌نویس درآمد و هزینه انجام نشد." }, { status: 500 });
  }
}
