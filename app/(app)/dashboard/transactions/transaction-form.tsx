"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persianFa from "react-date-object/locales/persian_fa";
import gregorianEn from "react-date-object/locales/gregorian_en";
import type { Account, Draft, Year } from "./types";

const field = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const normalize = (value: string) => value.trim().replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632));
const persianDate = (value: string) => new DateObject({ date: value, format: "YYYY-MM-DD", calendar: gregorian, locale: gregorianEn }).convert(persian, persianFa);

export function TransactionForm({ year, accounts, onCreated, initial, onCancel }: { year: Year; accounts: Account[]; onCreated: () => void; initial?: Draft; onCancel?: () => void }) {
  const dateId = useId();
  const [type, setType] = useState<"INCOME" | "EXPENSE">(initial?.type ?? "INCOME");
  const [category, setCategory] = useState(initial?.categoryAccountId ?? "");
  const [date, setDate] = useState<DateObject | null>(() => initial ? persianDate(initial.date.slice(0, 10)) : null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const categories = accounts.filter((account) => account.type === (type === "INCOME" ? "REVENUE" : "EXPENSE"));
  const settlementAccounts = accounts.filter((account) => account.type === "ASSET" && !account.assignedToParty);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError(""); setSuccess("");
    if (!date?.isValid) { setError("تاریخ را انتخاب کنید."); return; }
    const value = normalize(String(data.get("amount") ?? "")).replace(/^0+(?=\d)/, "");
    if (!/^[1-9]\d{0,19}$/.test(value)) { setError("مبلغ باید عدد صحیح مثبت و حداکثر ۲۰ رقم به ریال باشد."); return; }
    const convertedDate = new DateObject(date).convert(gregorian, gregorianEn).format("YYYY-MM-DD");
    if (convertedDate < year.startDate || convertedDate > year.endDate) { setError("تاریخ باید در محدوده سال مالی باز باشد."); return; }
    setPending(true);
    try {
      const payload = { type, date: convertedDate, amount: value, description: data.get("description"), paymentMethod: data.get("paymentMethod"), categoryAccountId: category, settlementAccountId: data.get("settlementAccountId") };
      const response = await fetch(initial ? `/api/transactions/${encodeURIComponent(initial.id)}` : "/api/transactions", { method: initial ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(initial ? payload : { ...payload, fiscalYearId: year.id }) });
      const body = await response.json();
      if (!response.ok) { setError(body.error || (initial ? "ویرایش پیش‌نویس انجام نشد." : "ثبت پیش‌نویس انجام نشد.")); return; }
      if (initial) { onCreated(); return; }
      form.reset(); setType("INCOME"); setCategory(""); setDate(null); setSuccess("پیش‌نویس ذخیره شد و سند حسابداری ایجاد نشد. فهرست بر اساس فیلترهای فعلی نمایش داده می‌شود."); onCreated();
    } catch { setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setPending(false); }
  }

  return <form onSubmit={submit} className="mt-5 space-y-4">
    <p className="text-sm text-slate-600">سال مالی باز: <span className="font-semibold text-slate-800">{year.name}</span></p>
    <label className="block text-sm font-medium">نوع عملیات<select value={type} onChange={(event) => { setType(event.target.value as "INCOME" | "EXPENSE"); setCategory(""); }} className={field}><option value="INCOME">درآمد</option><option value="EXPENSE">هزینه</option></select></label>
    <div className="text-sm font-medium"><label htmlFor={dateId}>تاریخ</label><DatePicker id={dateId} value={date} onChange={setDate} minDate={persianDate(year.startDate)} maxDate={persianDate(year.endDate)} calendar={persian} locale={persianFa} format="YYYY/MM/DD" inputClass={field} containerClassName="w-full" editable={false} placeholder="انتخاب تاریخ شمسی" /></div>
    <label className="block text-sm font-medium">مبلغ (ریال)<input name="amount" defaultValue={initial?.amount} required inputMode="numeric" maxLength={20} dir="ltr" className={field} /><span className="mt-1 block text-xs leading-6 text-slate-500">عدد صحیح مثبت را بدون جداکننده وارد کنید.</span></label>
    <label className="block text-sm font-medium">شرح<input name="description" defaultValue={initial?.description} required maxLength={500} className={field} /></label>
    <label className="block text-sm font-medium">حساب {type === "INCOME" ? "درآمد" : "هزینه"}<select required value={category} onChange={(event) => setCategory(event.target.value)} className={field}><option value="">انتخاب حساب</option>{initial && category === initial.categoryAccountId && !categories.some((account) => account.id === category) && <option value={category} disabled>{initial.categoryAccount.code} — {initial.categoryAccount.name} (دیگر قابل انتخاب نیست)</option>}{categories.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}</select></label>
    <label className="block text-sm font-medium">حساب تسویه<select name="settlementAccountId" required defaultValue={initial?.settlementAccountId ?? ""} className={field}><option value="">انتخاب حساب</option>{initial && !settlementAccounts.some((account) => account.id === initial.settlementAccountId) && <option value={initial.settlementAccountId} disabled>{initial.settlementAccount.code} — {initial.settlementAccount.name} (دیگر قابل انتخاب نیست)</option>}{settlementAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}</select><span className="mt-1 block text-xs leading-6 text-slate-500">یک حساب دارایی مناسب برای صندوق یا بانک انتخاب کنید.</span></label>
    {(!categories.length || !settlementAccounts.length) && <p className="rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-600">حساب فعال و بدون زیرحساب موردنیاز پیدا نشد. ابتدا آن را در <Link href="/dashboard/accounts" className="font-semibold text-emerald-700 underline">کدینگ حساب‌ها</Link> تعریف کنید.</p>}
    <label className="block text-sm font-medium">روش دریافت یا پرداخت<select name="paymentMethod" defaultValue={initial?.paymentMethod ?? "CASH"} className={field}><option value="CASH">نقدی</option><option value="BANK_TRANSFER">انتقال بانکی</option><option value="OTHER">سایر</option></select></label>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-700">{error}</p>}
    {success && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">{success}</p>}
    <button disabled={pending || !categories.length || !settlementAccounts.length} className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{pending ? "در حال ذخیره…" : initial ? "ذخیره تغییرات" : "ذخیره پیش‌نویس"}</button>
    {initial && <button type="button" disabled={pending} onClick={onCancel} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">انصراف از ویرایش</button>}
  </form>;
}
