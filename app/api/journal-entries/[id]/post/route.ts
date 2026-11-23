import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lockJournalAccounts } from "@/lib/journal-account-locks";
import { isTransactionConflict } from "@/lib/prisma-errors";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true } });
  if (!member || member.role === "VIEWER") return Response.json({ error: "اجازهٔ ثبت سند ندارید." }, { status: 403 });
  const { id } = await params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const initial = await tx.journalEntry.findFirst({ where: { id, organizationId: member.organizationId }, select: { fiscalYearId: true } });
      if (!initial) return { status: 404, error: "سند پیدا نشد." } as const;
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${initial.fiscalYearId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "JournalEntry" WHERE id = ${id} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const entry = await tx.journalEntry.findFirst({ where: { id, organizationId: member.organizationId }, select: { status: true, date: true, fiscalYear: { select: { status: true, startDate: true, endDate: true } }, lines: { select: { accountId: true, debit: true, credit: true } } } });
      if (!entry) return { status: 404, error: "سند پیدا نشد." } as const;
      if (entry.status !== "DRAFT") return { status: 409, error: "سند قبلاً ثبت نهایی شده است." } as const;
      if (entry.fiscalYear.status !== "OPEN" || entry.date < entry.fiscalYear.startDate || entry.date > entry.fiscalYear.endDate) return { status: 409, error: "سال مالی بسته است یا تاریخ سند در محدودهٔ آن نیست." } as const;
      if (entry.lines.length < 2) return { status: 400, error: "سند باید حداقل دو ردیف داشته باشد." } as const;
      let debit = 0n, credit = 0n;
      for (const line of entry.lines) { debit += BigInt(line.debit.toFixed(0)); credit += BigInt(line.credit.toFixed(0)); }
      if (debit === 0n || debit !== credit) return { status: 400, error: "جمع بدهکار و بستانکار باید برابر و بزرگ‌تر از صفر باشد." } as const;
      const ids = await lockJournalAccounts(tx, member.organizationId, entry.lines.map((line) => line.accountId));
      if (!ids) return { status: 409, error: "حساب یا شخص متصل معتبر و فعال نیست؛ در صورت تغییر هم‌زمان دوباره تلاش کنید." } as const;
      await tx.journalEntry.update({ where: { id }, data: { status: "POSTED" } });
      await tx.journalEvent.create({ data: { organizationId: member.organizationId, entryId: id, actorId: session.user.id, actorName: session.user.name, action: "POSTED" } });
      return { status: 200, entry: { id, status: "POSTED" } } as const;
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ entry: result.entry });
  } catch (error) {
    if (isTransactionConflict(error)) return Response.json({ error: "تغییر هم‌زمان رخ داد؛ دوباره تلاش کنید." }, { status: 409 });
    console.error("Journal posting failed", error);
    return Response.json({ error: "ثبت نهایی سند انجام نشد." }, { status: 500 });
  }
}
