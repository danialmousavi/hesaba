import { z } from "zod";

const price = z.string().regex(/^\d{1,20}$/, "قیمت باید عدد صحیح نامنفی و حداکثر ۲۰ رقم به ریال باشد.").transform((value) => BigInt(value).toString());
const fields = {
  code: z.string().trim().min(1, "کد کالا یا خدمت را وارد کنید.").max(50),
  name: z.string().trim().min(1, "نام کالا یا خدمت را وارد کنید.").max(150),
  type: z.enum(["GOODS", "SERVICE"]),
  unit: z.string().trim().min(1, "واحد را وارد کنید.").max(50),
  salePrice: price,
  purchasePrice: price.nullable(),
  description: z.string().trim().max(1000).nullable().transform((value) => value || null),
};
export const createProductSchema = z.strictObject({ ...fields, purchasePrice: fields.purchasePrice.optional(), description: fields.description.optional() });
export const updateProductSchema = z.strictObject({ ...fields, isActive: z.boolean() }).partial().refine((value) => Object.keys(value).length > 0, { message: "حداقل یک تغییر وارد کنید." });
export const productFields = { id: true, code: true, name: true, type: true, unit: true, salePrice: true, purchasePrice: true, description: true, isActive: true, createdAt: true, updatedAt: true } as const;
