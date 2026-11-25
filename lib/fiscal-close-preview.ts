import { createHash } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { calculateFiscalClose, ClosingCalculationError, type ClosingAccount } from "@/lib/fiscal-close-calculation";

const validDate = z.iso.date().refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
});
export const closingInputSchema = z.strictObject({ equityAccountId: z.string().cuid(), nextYear: z.strictObject({ name: z.string().trim().min(2).max(100), startDate: validDate, endDate: validDate }) });
const dateString = (date: Date) => date.toISOString().slice(0, 10);


export type ClosingInput = z.infer<typeof closingInputSchema>;
export async function buildClosingPreview(tx: Prisma.TransactionClient, organizationId: string, yearId: string, input: ClosingInput) {
      const year = await tx.fiscalYear.findFirst({ where: { id: yearId, organizationId: organizationId }, select: { id: true, name: true, startDate: true, endDate: true, status: true } });
      if (!year) return null;
      const [years, drafts, financialDrafts, invoiceDrafts, paymentDrafts, entries, accountRows] = await Promise.all([
        tx.fiscalYear.findMany({ where: { organizationId: organizationId }, orderBy: { id: "asc" }, select: { id: true, name: true, startDate: true, endDate: true, status: true } }),
        tx.journalEntry.count({ where: { organizationId: organizationId, fiscalYearId: year.id, status: "DRAFT" } }),
        tx.financialTransaction.count({ where: { organizationId: organizationId, fiscalYearId: year.id, status: "DRAFT" } }),
        tx.invoice.count({ where: { organizationId: organizationId, fiscalYearId: year.id, status: "DRAFT" } }),
        tx.payment.count({ where: { organizationId: organizationId, fiscalYearId: year.id, status: "DRAFT" } }),
        tx.journalEntry.findMany({ where: { organizationId: organizationId, fiscalYearId: year.id, status: "POSTED" }, orderBy: { id: "asc" }, select: { id: true, date: true, number: true, lines: { orderBy: { id: "asc" }, select: { id: true, accountId: true, debit: true, credit: true } } } }),
        tx.ledgerAccount.findMany({ where: { organizationId: organizationId }, orderBy: { id: "asc" }, select: { id: true, code: true, name: true, type: true, isActive: true, children: { orderBy: { id: "asc" }, select: { id: true } }, partyLinks: { orderBy: { partyId: "asc" }, select: { partyId: true, purpose: true, party: { select: { name: true, isActive: true } } } } } }),
      ]);
      const blockers: string[] = [];
      if (year.status !== "OPEN") blockers.push("سال مالی مبدأ باز نیست.");
      if (drafts || financialDrafts || invoiceDrafts || paymentDrafts) blockers.push("سال مالی دارای پیش‌نویس است؛ ابتدا وضعیت همه پیش‌نویس‌ها را تعیین کنید.");
      const nextDay = new Date(year.endDate); nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      if (input.nextYear.startDate !== dateString(nextDay) || input.nextYear.endDate <= input.nextYear.startDate) blockers.push("سال مقصد باید بلافاصله پس از مبدأ شروع و پس از تاریخ شروع پایان یابد.");
      if (years.some((item) => item.name === input.nextYear.name || (dateString(item.startDate) <= input.nextYear.endDate && dateString(item.endDate) >= input.nextYear.startDate))) blockers.push("نام سال مقصد تکراری است یا بازه آن با سال دیگری هم‌پوشانی دارد.");
      const equity = accountRows.find((account) => account.id === input.equityAccountId);
      if (!equity || equity.type !== "EQUITY" || !equity.isActive || equity.children.length || equity.partyLinks.length) blockers.push("حساب نتیجه دوره باید سرمایه فعال، بدون زیرحساب و بدون اتصال شخص باشد.");
      const totals = new Map<string, { debit: bigint; credit: bigint }>();
      let invalidEntry = false;
      for (const entry of entries) {
        let balance = 0n, debitTotal = 0n;
        for (const line of entry.lines) {
          const debit = BigInt(line.debit.toFixed(0)), credit = BigInt(line.credit.toFixed(0));
          balance += debit - credit; debitTotal += debit;
          const current = totals.get(line.accountId) ?? { debit: 0n, credit: 0n };
          current.debit += debit; current.credit += credit; totals.set(line.accountId, current);
        }
        if (entry.date < year.startDate || entry.date > year.endDate || entry.lines.length < 2 || entry.lines.length > 100 || balance !== 0n || debitTotal === 0n) invalidEntry = true;
      }
      if (invalidEntry) blockers.push("تاریخ یا ردیف‌های یک یا چند سند ثبت‌شده معتبر و متوازن نیستند.");
      for (const account of accountRows) {
        const total = totals.get(account.id);
        if (total && total.debit !== total.credit && (!account.isActive || account.children.length || account.partyLinks.some((link) => !link.party.isActive))) blockers.push(`حساب ${account.code} یا شخص متصل به آن فعال و ثبت‌پذیر نیست.`);
      }
      if ([...totals.keys()].some((id) => !accountRows.some((account) => account.id === id))) blockers.push("حساب مرتبط با سند پیدا نشد.");
      const accounts: ClosingAccount[] = accountRows.filter((account) => totals.has(account.id) || account.id === equity?.id).map((account) => ({ id: account.id, code: account.code, name: account.name, type: account.type, debit: (totals.get(account.id)?.debit ?? 0n).toString(), credit: (totals.get(account.id)?.credit ?? 0n).toString() }));
      let calculation = null;
      if (equity?.type === "EQUITY") {
        try { calculation = calculateFiscalClose(accounts, equity.id); }
        catch (error) { if (error instanceof ClosingCalculationError) blockers.push(error.message); else throw error; }
      }
      const accountDetails = accountRows.filter((account) => totals.has(account.id) || account.id === equity?.id).map((account) => ({ id: account.id, isActive: account.isActive, hasChildren: account.children.length > 0, parties: account.partyLinks }));
      const data = { fiscalYear: { ...year, startDate: dateString(year.startDate), endDate: dateString(year.endDate) }, nextYear: input.nextYear, equityAccountId: input.equityAccountId, drafts: { journals: drafts, transactions: financialDrafts, invoices: invoiceDrafts, payments: paymentDrafts }, sourceJournalCount: entries.length, accountDetails, calculation, blockers, canConfirm: false, previewOnly: true };
      // Capture source identity and metadata as well as totals; this is still not an execution authorization.
      const snapshot = { organizationId: organizationId, data, years, entries, accountRows };
      return { ...data, previewFingerprint: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex") };
}
