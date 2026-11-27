import Link from "next/link";
import { activeOrganizationTestEnabled } from "@/lib/active-organization";
import { OrganizationPicker } from "../organization-picker";
import { connection } from "next/server";

export const instant = false;

export default async function SelectOrganizationPage() {
  await connection();
  return <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-5"><section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-right shadow-sm"><h1 className="font-modam text-xl font-bold">انتخاب سازمان</h1><p className="mt-3 text-sm leading-7 text-slate-600">سازمان فعال این نشست مشخص نیست یا دسترسی آن تغییر کرده است.</p><div className="mt-5">{activeOrganizationTestEnabled() ? <OrganizationPicker standalone /> : <p className="text-sm text-slate-600">انتخاب سازمان در حال آماده‌سازی است.</p>}</div><Link href="/sign-in" className="mt-4 inline-block text-sm font-semibold text-emerald-700 underline">بازگشت به ورود</Link></section></main>;
}
