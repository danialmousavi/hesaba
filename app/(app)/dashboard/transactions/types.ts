export type Year = { id: string; name: string; status: "OPEN" | "CLOSED"; startDate: string; endDate: string };
export type Account = { id: string; name: string; code: string; type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"; assignedToParty: boolean };
export type Draft = { id: string; type: "INCOME" | "EXPENSE"; date: string; amount: string; description: string; paymentMethod: "CASH" | "BANK_TRANSFER" | "OTHER"; fiscalYear: { name: string; status: "OPEN" | "CLOSED" }; categoryAccount: { code: string; name: string }; settlementAccount: { code: string; name: string } };
