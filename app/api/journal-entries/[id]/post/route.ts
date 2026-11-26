import { prisma } from "@/lib/prisma";
import { lockJournalAccounts } from "@/lib/journal-account-locks";
import { isTransactionConflict } from "@/lib/prisma-errors";
import { guardOrganizationWrite, organizationContext, organizationContextError } from "@/lib/organization-context";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const member = await organizationContext(request, 403).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  if (member.role === "VIEWER") return Response.json({ error: "اجازهٔ ثبت سند ندارید." }, { status: 403 });
  const { id } = await params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      await guardOrganizationWrite(tx, member, request, ["ADMIN", "ACCOUNTANT"]);
      const initial = await tx.journalEntry.findFirst({ where: { id, organizationId: member.organizationId }, select: { fiscalYearId: true } });
      if (!initial) return { status: 404, error: "سند پیدا نشد." } as const;
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${initial.fiscalYearId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "JournalEntry" WHERE id = ${id} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const entry = await tx.journalEntry.findFirst({ where: { id, organizationId: member.organizationId }, select: { status: true, date: true, fiscalYear: { select: { status: true, startDate: true, endDate: true } }, lines: { select: { accountId: true, description: true, debit: true, credit: true } }, reversalOf: { select: { source: { select: { status: true, date: true, reversalOf: { select: { sourceEntryId: true } }, invoice: { select: { id: true } }, payment: { select: { id: true } }, financialTransaction: { select: { id: true } }, lines: { select: { accountId: true, description: true, debit: true, credit: true } } } } } } } });
      if (!entry) return { status: 404, error: "سند پیدا نشد." } as const;
      if (entry.status !== "DRAFT") return { status: 409, error: "سند قبلاً ثبت نهایی شده است." } as const;
      if (entry.fiscalYear.status !== "OPEN" || entry.date < entry.fiscalYear.startDate || entry.date > entry.fiscalYear.endDate) return { status: 409, error: "سال مالی بسته است یا تاریخ سند در محدودهٔ آن نیست." } as const;
      if (entry.reversalOf) {
        const source = entry.reversalOf.source;
        if (source.status !== "POSTED" || source.date > entry.date || source.reversalOf || source.invoice || source.payment || source.financialTransaction) return { status: 409, error: "سند اصلی برای ثبت برگشت معتبر نیست." } as const;
        const original = source.lines.map((line) => JSON.stringify([line.accountId, line.description, line.credit.toFixed(0), line.debit.toFixed(0)])).sort();
        const reversed = entry.lines.map((line) => JSON.stringify([line.accountId, line.description, line.debit.toFixed(0), line.credit.toFixed(0)])).sort();
        if (original.length !== reversed.length || original.some((line, index) => line !== reversed[index])) return { status: 409, error: "ردیف‌های برگشت با سند اصلی مطابقت ندارند." } as const;
      }
      if (entry.lines.length < 2) return { status: 400, error: "سند باید حداقل دو ردیف داشته باشد." } as const;
      let debit = 0n, credit = 0n;
      for (const line of entry.lines) { debit += BigInt(line.debit.toFixed(0)); credit += BigInt(line.credit.toFixed(0)); }
      if (debit === 0n || debit !== credit) return { status: 400, error: "جمع بدهکار و بستانکار باید برابر و بزرگ‌تر از صفر باشد." } as const;
      const ids = await lockJournalAccounts(tx, member.organizationId, entry.lines.map((line) => line.accountId));
      if (!ids) return { status: 409, error: "حساب یا شخص متصل معتبر و فعال نیست؛ در صورت تغییر هم‌زمان دوباره تلاش کنید." } as const;
      await tx.journalEntry.update({ where: { id }, data: { status: "POSTED" } });
      await tx.journalEvent.create({ data: { organizationId: member.organizationId, entryId: id, actorId: member.userId, actorName: member.userName, action: "POSTED" } });
      return { status: 200, entry: { id, status: "POSTED" } } as const;
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ entry: result.entry });
  } catch (error) {
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    if (isTransactionConflict(error)) return Response.json({ error: "تغییر هم‌زمان رخ داد؛ دوباره تلاش کنید." }, { status: 409 });
    console.error("Journal posting failed", error);
    return Response.json({ error: "ثبت نهایی سند انجام نشد." }, { status: 500 });
  }
}
