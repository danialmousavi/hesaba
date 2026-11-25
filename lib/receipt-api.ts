import "server-only";
import { Prisma } from "@/generated/prisma/client";

export const receiptFields = {
  id: true, fiscalYearId: true, partyId: true, type: true, status: true, date: true,
  amount: true, method: true, settlementAccountId: true, description: true, requestKey: true,
  journalEntryId: true, journalEntry: { select: { number: true } }, createdAt: true,
  party: { select: { name: true } }, settlementAccount: { select: { code: true, name: true } },
  allocations: { orderBy: { invoiceId: "asc" }, select: { invoiceId: true, amount: true, invoice: { select: { number: true } } } },
} satisfies Prisma.PaymentSelect;

type Receipt = Prisma.PaymentGetPayload<{ select: typeof receiptFields }>;
export function serializeReceipt(receipt: Receipt) {
  return { id: receipt.id, fiscalYearId: receipt.fiscalYearId, partyId: receipt.partyId, party: receipt.party, type: receipt.type, status: receipt.status, date: receipt.date.toISOString().slice(0, 10), amount: receipt.amount.toFixed(0), method: receipt.method, settlementAccountId: receipt.settlementAccountId, settlementAccount: receipt.settlementAccount, description: receipt.description, requestKey: receipt.requestKey, journalEntryId: receipt.journalEntryId, journalEntry: receipt.journalEntry, createdAt: receipt.createdAt, allocations: receipt.allocations.map((allocation) => ({ ...allocation, amount: allocation.amount.toFixed(0) })) };
}
