import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lockFinancialAccounts } from "@/lib/financial-accounts";
import { markPartyAccountsUsed } from "@/lib/journal-account-locks";
import { isTransactionConflict } from "@/lib/prisma-errors";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true } });
  if (!member || member.role === "VIEWER") return Response.json({ error: "اجازه ثبت نهایی ندارید." }, { status: 403 });
  const id = z.string().cuid().safeParse((await params).id);
  if (!id.success) return Response.json({ error: "شناسه پیش‌نویس معتبر نیست." }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const initial = await tx.financialTransaction.findFirst({ where: { id: id.data, organizationId: member.organizationId }, select: { fiscalYearId: true } });
      if (!initial) return { status: 404, error: "پیش‌نویس پیدا نشد." } as const;
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${initial.fiscalYearId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "FinancialTransaction" WHERE id = ${id.data} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const record = await tx.financialTransaction.findFirst({ where: { id: id.data, organizationId: member.organizationId }, select: { id: true, fiscalYearId: true, status: true, type: true, date: true, amount: true, description: true, categoryAccountId: true, settlementAccountId: true, fiscalYear: { select: { status: true, startDate: true, endDate: true } } } });
      if (!record) return { status: 404, error: "پیش‌نویس پیدا نشد." } as const;
      if (record.status !== "DRAFT") return { status: 409, error: "این رویداد قبلاً ثبت نهایی شده است." } as const;
      if (record.fiscalYear.status !== "OPEN" || record.date < record.fiscalYear.startDate || record.date > record.fiscalYear.endDate) return { status: 409, error: "سال مالی بسته است یا تاریخ خارج از محدودهٔ آن است." } as const;
      const amount = record.amount.toFixed(0);
      if (BigInt(amount) <= 0n) return { status: 400, error: "مبلغ معتبر نیست." } as const;
      const accountIds = await lockFinancialAccounts(tx, member.organizationId, record.type, record.categoryAccountId, record.settlementAccountId);
      if (!accountIds) return { status: 409, error: "حساب‌ها تغییر کرده‌اند یا دیگر برای ثبت نهایی معتبر نیستند." } as const;
      const max = await tx.journalEntry.aggregate({ where: { organizationId: member.organizationId, fiscalYearId: record.fiscalYearId }, _max: { number: true } });
      const number = (max._max.number ?? 0) + 1;
      if (number > 2147483647) return { status: 409, error: "شماره سند جدید در این سال مالی در دسترس نیست." } as const;
      const debitAccount = record.type === "INCOME" ? record.settlementAccountId : record.categoryAccountId;
      const creditAccount = record.type === "INCOME" ? record.categoryAccountId : record.settlementAccountId;
      const entry = await tx.journalEntry.create({ data: { organizationId: member.organizationId, fiscalYearId: record.fiscalYearId, number, date: record.date, description: record.description, lines: { create: [{ accountId: debitAccount, debit: amount, credit: "0" }, { accountId: creditAccount, debit: "0", credit: amount }] } }, select: { id: true } });
      await markPartyAccountsUsed(tx, member.organizationId, accountIds);
      await tx.journalEntry.update({ where: { id: entry.id }, data: { status: "POSTED" } });
      await tx.journalEvent.create({ data: { organizationId: member.organizationId, entryId: entry.id, actorId: session.user.id, actorName: session.user.name, action: "POSTED" } });
      await tx.financialTransaction.update({ where: { id: record.id }, data: { status: "POSTED", journalEntryId: entry.id } });
      return { status: 200, journal: { id: entry.id, number }, transaction: { id: record.id, status: "POSTED" } } as const;
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ transaction: result.transaction, journal: result.journal }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isTransactionConflict(error) || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) return Response.json({ error: "تغییر هم‌زمان رخ داد؛ دوباره تلاش کنید." }, { status: 409 });
    console.error("Financial transaction posting failed", error);
    return Response.json({ error: "ثبت نهایی درآمد یا هزینه انجام نشد." }, { status: 500 });
  }
}
