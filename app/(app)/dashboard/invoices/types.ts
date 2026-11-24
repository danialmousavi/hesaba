export type Year = { id: string; name: string; status: "OPEN" | "CLOSED"; startDate: string; endDate: string };
export type Customer = { id: string; name: string };
export type Product = { id: string; name: string; code: string; unit: string; salePrice: string };
export type Invoice = { id: string; revision: number; fiscalYearId: string; customerId: string; customerName: string; date: string; description: string | null; totals: { subtotal: string; discountAmount: string; taxAmount: string; total: string }; lines: { id: string; productId: string; productCode: string; productName: string; unit: string; quantity: string; unitPrice: string; discountAmount: string; taxAmount: string; amounts: { total: string } }[] };
