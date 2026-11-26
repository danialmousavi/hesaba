import { z } from "zod";

const fields = z.strictObject({
  fiscalYearId: z.string().cuid(),
  type: z.enum(["INCOME", "EXPENSE"]),
  date: z.iso.date(),
  amount: z.string().regex(/^[1-9]\d{0,19}$/, "مبلغ باید عدد صحیح مثبت و حداکثر ۲۰ رقم به ریال باشد."),
  description: z.string().trim().min(1, "شرح را وارد کنید.").max(500),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "OTHER"]),
  categoryAccountId: z.string().cuid(),
  settlementAccountId: z.string().cuid(),
});
const differentAccounts = (value: { categoryAccountId: string; settlementAccountId: string }) => value.categoryAccountId !== value.settlementAccountId;
const message = { message: "حساب درآمد یا هزینه و حساب تسویه باید متفاوت باشند." };
export const financialTransactionInput = fields.refine(differentAccounts, message);
export const financialDraftEditInput = fields.omit({ fiscalYearId: true }).refine(differentAccounts, message);
