export type Product = { id: string; code: string; name: string; type: "GOODS" | "SERVICE"; unit: string; salePrice: string; purchasePrice: string | null; description: string | null; isActive: boolean };

export const normalizeDigits = (value: string) => value.trim().replace(/[۰-۹٠-٩]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".includes(digit) ? "۰۱۲۳۴۵۶۷۸۹".indexOf(digit) : "٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
export const validPrice = (value: string) => /^\d{1,20}$/.test(value);
