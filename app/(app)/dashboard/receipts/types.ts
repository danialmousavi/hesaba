export type Year = { id: string; name: string; startDate: string; endDate: string };
export type Customer = { id: string; name: string; receivable: { id: string; code: string; name: string; isActive: boolean; hasChildren: boolean } | null };
export type Account = { id: string; code: string; name: string };
export type OpenInvoice = { id: string; number: number; date: string; fiscalYearId: string; total: string; paid: string; remaining: string };
export type InvoiceResult = { invoices: OpenInvoice[]; total: number; page: number; pageSize: number };
export type Receipt = { id: string; fiscalYearId: string; party: { name: string }; date: string; amount: string; method: "CASH" | "BANK_TRANSFER" | "OTHER"; settlementAccount: Account; description: string | null; journalEntryId: string; journalEntry: { number: number }; allocations: { invoiceId: string; amount: string; invoice: { number: number } }[] };
export type ReceiptInput = { requestKey: string; fiscalYearId: string; partyId: string; date: string; amount: string; method: "CASH" | "BANK_TRANSFER" | "OTHER"; settlementAccountId: string; description: string | null; allocations: { invoiceId: string; amount: string }[] };
