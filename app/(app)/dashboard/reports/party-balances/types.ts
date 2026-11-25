export type Year = { id: string; name: string; status: "OPEN" | "CLOSED" };
export type Balance = { account: { id: string; code: string; name: string; isActive: boolean }; debit: string; credit: string; debitBalance: string; creditBalance: string; net: string };
export type PartyRow = { id: string; name: string; isCustomer: boolean; isSupplier: boolean; isActive: boolean; receivable: Balance | null; payable: Balance | null };
export type PartyResult = { fiscalYear: { id: string; name: string; endDate: string }; rows: PartyRow[]; total: number; page: number; pageSize: number };
export type InvoiceRow = { id: string; number: number; date: string; journalEntryId: string | null; amount: string; paid: string; remaining: string };
export type InvoiceResult = { fiscalYear: { id: string; name: string; endDate: string }; party: { id: string; name: string }; rows: InvoiceRow[]; total: number; page: number; pageSize: number };
