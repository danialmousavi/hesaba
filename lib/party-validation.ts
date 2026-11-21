import { z } from "zod";

const text = (max: number) => z.string().trim().max(max).nullable().transform((value) => value || null);
const email = z.string().trim().pipe(z.union([z.email("ایمیل معتبر نیست."), z.literal("")])).nullable().transform((value) => value || null);
const fields = {
  name: z.string().trim().min(1, "نام شخص را وارد کنید.").max(150),
  isCustomer: z.boolean(),
  isSupplier: z.boolean(),
  phone: text(40),
  email,
  address: text(1000),
};

export const createPartySchema = z.strictObject({
  ...fields, phone: fields.phone.optional(), email: fields.email.optional(), address: fields.address.optional(),
}).refine((value) => value.isCustomer || value.isSupplier, { message: "حداقل یک نقش برای شخص انتخاب کنید." });

export const updatePartySchema = z.strictObject({ ...fields, isActive: z.boolean() }).partial()
  .refine((value) => Object.keys(value).length > 0, { message: "حداقل یک تغییر وارد کنید." })
  .refine((value) => value.isCustomer !== false || value.isSupplier !== false, { message: "حداقل یک نقش برای شخص انتخاب کنید." });

export const partyFields = { id: true, name: true, isCustomer: true, isSupplier: true, phone: true, email: true, address: true, isActive: true, createdAt: true, updatedAt: true } as const;
