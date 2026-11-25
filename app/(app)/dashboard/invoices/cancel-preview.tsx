"use client";

import { useId, useState, type FormEvent } from "react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persianFa from "react-date-object/locales/persian_fa";
import gregorianEn from "react-date-object/locales/gregorian_en";
import type { Invoice, Year } from "./types";

const persianDate = (value: string) => new DateObject({ date: value, format: "YYYY-MM-DD", calendar: gregorian, locale: gregorianEn }).convert(persian, persianFa);
const field = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";

export function CancelPreview({ invoice, year, pending, onConfirm, onClose }: { invoice: Invoice; year: Year; pending: boolean; onConfirm: (date: string, reason: string) => void; onClose: () => void }) {
  const dateId = useId();
  const [date, setDate] = useState<DateObject | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!date?.isValid) { setError("تاریخ ابطال را انتخاب کنید."); return; }
    const selected = new DateObject(date).convert(gregorian, gregorianEn).format("YYYY-MM-DD");
    if (selected < invoice.date || selected < year.startDate || selected > year.endDate) { setError("تاریخ ابطال باید در سال مالی فاکتور و در تاریخ صدور یا پس از آن باشد."); return; }
    if (!reason.trim()) { setError("دلیل ابطال را وارد کنید."); return; }
    setError(""); onConfirm(selected, reason.trim());
  }
  return <form onSubmit={submit} aria-label={`ابطال فاکتور شماره ${invoice.number}`} className="mt-4 space-y-4 rounded-xl border border-red-200 bg-red-50/40 p-4">
    <div><h4 className="font-semibold text-red-950">بررسی و تأیید ابطال</h4><p className="mt-2 text-sm leading-7 text-slate-700">با تأیید، فاکتور باطل و سند حسابداری معکوس فوراً ثبت نهایی می‌شود. سند و فاکتور اصلی برای پیگیری حفظ می‌شوند.</p><p className="mt-2 text-sm leading-7 text-slate-600">فقط فاکتور بدون تخصیص دریافت در سال مالی باز قابل ابطال است. مبلغ فاکتور: {BigInt(invoice.totals.total).toLocaleString("fa-IR")} ریال.</p></div>
    <div className="text-sm font-medium"><label htmlFor={dateId}>تاریخ ابطال</label><DatePicker id={dateId} value={date} onChange={setDate} minDate={persianDate(invoice.date > year.startDate ? invoice.date : year.startDate)} maxDate={persianDate(year.endDate)} calendar={persian} locale={persianFa} format="YYYY/MM/DD" inputClass={field} containerClassName="w-full" editable={false} placeholder="انتخاب تاریخ شمسی" disabled={pending} /></div>
    <label className="block text-sm font-medium">دلیل ابطال<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} disabled={pending} className={field} placeholder="دلیل ابطال را بنویسید" /></label>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-2"><button type="submit" disabled={pending} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50">{pending ? "در حال ابطال…" : "تأیید و ابطال فاکتور"}</button><button type="button" disabled={pending} onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm disabled:opacity-50">انصراف</button></div>
  </form>;
}
