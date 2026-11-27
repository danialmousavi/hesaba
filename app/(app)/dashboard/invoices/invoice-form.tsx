"use client";

import { organizationFetch as fetch } from "@/lib/organization-fetch";

import { useId, useState, type FormEvent } from "react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persianFa from "react-date-object/locales/persian_fa";
import gregorianEn from "react-date-object/locales/gregorian_en";
import { calculateInvoice } from "@/lib/invoice-calculation";
import type { Customer, Invoice, Product, Year } from "./types";

const field = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const normalize = (value: string) => value.trim().replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632)).replace(/٫/g, ".");
const persianDate = (value: string) => new DateObject({ date: value, format: "YYYY-MM-DD", calendar: gregorian, locale: gregorianEn }).convert(persian, persianFa);
type Line = { key: number; id?: string; productId: string; productName?: string; quantity: string; unitPrice: string; discountAmount: string; taxAmount: string };
const blankLine = (key: number): Line => ({ key, productId: "", quantity: "1", unitPrice: "", discountAmount: "0", taxAmount: "0" });
const money = (value: string) => BigInt(value).toLocaleString("fa-IR");

export function InvoiceForm({ year, customers, products, initial, onCreated, onCancel, onConflict, onPendingChange, onDirty }: { year: Year; customers: Customer[]; products: Product[]; initial?: Invoice; onCreated: () => void; onCancel?: () => void; onConflict?: () => void; onPendingChange?: (pending: boolean) => void; onDirty?: () => void }) {
  const dateId = useId();
  const [date, setDate] = useState<DateObject | null>(() => initial ? persianDate(initial.date) : null);
  const [lines, setLines] = useState<Line[]>(() => initial ? initial.lines.map((line, index) => ({ ...line, key: index + 1 })) : [blankLine(1)]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savedTotal, setSavedTotal] = useState<string | null>(null);
  const normalizedLines = lines.map(({ id, productId, quantity, unitPrice, discountAmount, taxAmount }) => ({ ...(initial && id ? { id } : {}), productId, quantity: normalize(quantity), unitPrice: normalize(unitPrice), discountAmount: normalize(discountAmount), taxAmount: normalize(taxAmount) }));
  let preview: ReturnType<typeof calculateInvoice> | null = null;
  try { if (normalizedLines.every((line) => line.productId)) preview = calculateInvoice(normalizedLines); } catch { /* incomplete input */ }

  function update(key: number, values: Partial<Line>) { onDirty?.(); setLines((current) => current.map((line) => line.key === key ? { ...line, ...values } : line)); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError(""); setSuccess(""); setSavedTotal(null);
    if (!date?.isValid) { setError("تاریخ را انتخاب کنید."); return; }
    const convertedDate = new DateObject(date).convert(gregorian, gregorianEn).format("YYYY-MM-DD");
    if (convertedDate < year.startDate || convertedDate > year.endDate) { setError("تاریخ باید در محدوده سال مالی باز باشد."); return; }
    if (!customers.some((customer) => customer.id === data.get("customerId")) || lines.some((line) => !products.some((product) => product.id === line.productId))) { setError("مشتری یا کالای غیرفعال را با مورد فعال جایگزین کنید."); return; }
    if (!preview) { setError("اطلاعات اقلام را بررسی کنید؛ تعداد باید مثبت باشد و تخفیف از مبلغ قلم بیشتر نباشد."); return; }
    setPending(true); onPendingChange?.(true);
    try {
      const response = await fetch(initial ? `/api/invoices/${encodeURIComponent(initial.id)}` : "/api/invoices", { method: initial ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...(initial ? { revision: initial.revision } : { fiscalYearId: year.id }), customerId: data.get("customerId"), date: convertedDate, description: data.get("description"), lines: normalizedLines }) });
      const body = await response.json();
      if (!response.ok) { setError(response.status === 409 && initial ? "فاکتور هم‌زمان تغییر کرده است. تغییرات فعلی ذخیره نشده‌اند؛ برای دریافت نسخه جدید، انصراف دهید و دوباره ویرایش را انتخاب کنید." : response.status >= 500 ? "نتیجه ذخیره نامشخص است؛ پیش از تلاش دوباره فهرست فاکتورها را بررسی کنید." : body.error || "ذخیره فاکتور انجام نشد."); onConflict?.(); return; }
      if (initial) { onCreated(); return; }
      setSavedTotal(body.invoice.totals.total); setSuccess("پیش‌نویس ذخیره شد. مبلغ ثبت‌شده:"); form.reset(); setDate(null); setLines([blankLine(1)]); onCreated();
    } catch { setError("پاسخ سرور دریافت نشد؛ پیش از تلاش دوباره فهرست فاکتورها را بررسی کنید."); onConflict?.(); }
    finally { setPending(false); onPendingChange?.(false); }
  }

  return <form onSubmit={submit} onChangeCapture={onDirty} className="mt-5"><fieldset disabled={pending} className="space-y-4">
    <p className="text-sm text-slate-600">سال مالی باز: <span className="font-semibold text-slate-800">{year.name}</span></p>
    <label className="block text-sm font-medium">مشتری<select name="customerId" defaultValue={initial?.customerId ?? ""} required className={field}><option value="">انتخاب مشتری</option>{initial && !customers.some((customer) => customer.id === initial.customerId) && <option value={initial.customerId} disabled>{initial.customerName} (غیرفعال؛ مشتری دیگری انتخاب کنید)</option>}{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
    <div className="text-sm font-medium"><label htmlFor={dateId}>تاریخ فاکتور</label><DatePicker id={dateId} value={date} onChange={(value) => { setDate(value); onDirty?.(); }} minDate={persianDate(year.startDate)} maxDate={persianDate(year.endDate)} calendar={persian} locale={persianFa} format="YYYY/MM/DD" inputClass={field} containerClassName="w-full" editable={false} placeholder="انتخاب تاریخ شمسی" /></div>
    <label className="block text-sm font-medium">شرح (اختیاری)<input name="description" defaultValue={initial?.description ?? ""} maxLength={500} className={field} /></label>
    <fieldset className="space-y-3"><legend className="text-sm font-semibold">اقلام فاکتور</legend>
      {lines.map((line, index) => <div key={line.key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">قلم {index + 1}</p>{lines.length > 1 && <button type="button" disabled={pending} onClick={() => { onDirty?.(); setLines((current) => current.filter((item) => item.key !== line.key)); }} className="text-sm font-medium text-red-700 disabled:opacity-50">حذف قلم</button>}</div>
        <label className="mt-3 block text-sm font-medium">کالا یا خدمت<select required value={line.productId} onChange={(event) => { const product = products.find((item) => item.id === event.target.value); update(line.key, { id: undefined, productId: event.target.value, unitPrice: product?.salePrice ?? "" }); }} className={field}><option value="">انتخاب کالا یا خدمت</option>{line.productId && !products.some((product) => product.id === line.productId) && <option value={line.productId} disabled>{line.productName} (غیرفعال؛ کالای دیگری انتخاب کنید)</option>}{products.map((product) => <option key={product.id} value={product.id}>{product.code} — {product.name} ({product.unit})</option>)}</select></label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">تعداد<input required inputMode="decimal" dir="ltr" maxLength={19} value={line.quantity} onChange={(event) => update(line.key, { quantity: event.target.value })} className={field} /></label>
          <label className="block text-sm font-medium">قیمت واحد (ریال)<input required inputMode="numeric" dir="ltr" maxLength={20} value={line.unitPrice} onChange={(event) => update(line.key, { unitPrice: event.target.value })} className={field} /></label>
          <label className="block text-sm font-medium">تخفیف (ریال)<input required inputMode="numeric" dir="ltr" maxLength={20} value={line.discountAmount} onChange={(event) => update(line.key, { discountAmount: event.target.value })} className={field} /></label>
          <label className="block text-sm font-medium">مالیات (ریال)<input required inputMode="numeric" dir="ltr" maxLength={20} value={line.taxAmount} onChange={(event) => update(line.key, { taxAmount: event.target.value })} className={field} /></label>
        </div>
        {preview && <p className="mt-3 text-sm text-slate-700">جمع قلم: {money(preview.lines[index].total)} ریال</p>}
      </div>)}
      <button type="button" disabled={pending || lines.length >= 100} onClick={() => { onDirty?.(); setLines((current) => [...current, blankLine(Math.max(...current.map((line) => line.key)) + 1)]); }} className="text-sm font-semibold text-emerald-700 disabled:opacity-50">+ افزودن قلم</button>
    </fieldset>
    <p className="text-xs leading-6 text-slate-500">تعداد تا سه رقم اعشار پذیرفته می‌شود؛ تخفیف و مالیات مبلغ ریالی هستند. جمع نهایی هنگام ذخیره در سرور محاسبه می‌شود.</p>
    {preview && <div className="rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700"><p>جمع کالاها: {money(preview.totals.subtotal)} ریال</p><p>تخفیف: {money(preview.totals.discountAmount)} ریال · مالیات: {money(preview.totals.taxAmount)} ریال</p><p className="font-bold text-slate-900">جمع پیش‌بینی‌شده: {money(preview.totals.total)} ریال</p></div>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-700">{error}</p>}
    {success && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">{success} {savedTotal !== null && `${money(savedTotal)} ریال`}</p>}
    <button disabled={pending} className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{pending ? "در حال ذخیره…" : initial ? "ذخیره تغییرات" : "ذخیره پیش‌نویس"}</button>
    {initial && <button type="button" onClick={onCancel} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">انصراف از ویرایش</button>}
  </fieldset></form>;
}
