export type Year = { id: string; name: string; startDate: string; endDate: string };
export type Supplier = { id: string; name: string; payable: { id: string; code: string; name: string; isActive: boolean; hasChildren: boolean } | null };
export type Account = { id: string; code: string; name: string };
export type PaymentInput = { requestKey: string; fiscalYearId: string; partyId: string; date: string; amount: string; method: "CASH" | "BANK_TRANSFER" | "OTHER"; settlementAccountId: string; description: string | null };
export type Payment = { id: string; party: { name: string }; date: string; amount: string; method: PaymentInput["method"]; settlementAccount: Account; description: string | null; journalEntryId: string; journalEntry: { number: number } };
