"use client";

import { useState, type FormEvent } from "react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persianFa from "react-date-object/locales/persian_fa";
import gregorianEn from "react-date-object/locales/gregorian_en";

export type DashboardRange = { from: string; to: string };
const toPersian = (value: string) => new DateObject({ date: value, format: "YYYY-MM-DD", calendar: gregorian, locale: gregorianEn }).convert(persian, persianFa);
const toIso = (value: DateObject) => new DateObject(value).convert(gregorian, gregorianEn).format("YYYY-MM-DD");
const inputClass = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";

export function DashboardDateFilter({ startDate, endDate, onApply }: { startDate: string; endDate: string; onApply: (range: DashboardRange | null) => void }) {
  const [from, setFrom] = useState<DateObject | null>(() => toPersian(startDate));
  const [to, setTo] = useState<DateObject | null>(() => toPersian(endDate));
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!from || !to || !from.isValid || !to.isValid) { setError("تاریخ شروع و پایان را انتخاب کنید."); return; }
    const range = { from: toIso(from), to: toIso(to) };
    if (range.from > range.to) { setError("تاریخ شروع نباید بعد از تاریخ پایان باشد."); return; }
    if (range.from < startDate || range.to > endDate) { setError("بازه باید در محدوده سال مالی باشد."); return; }
    setError("");
    onApply(range);
  }

  function reset() {
    setFrom(toPersian(startDate)); setTo(toPersian(endDate)); setError(""); onApply(null);
  }

  return <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="فیلتر بازه عملکرد">
    <h2 className="font-modam text-lg font-bold text-slate-900">بازه عملکرد</h2>
    <p className="mt-1 text-sm leading-7 text-slate-600">این بازه روی درآمد، هزینه، سود و زیان، نمودار ماهانه و اسناد اثر دارد. فروش و مانده‌ها همچنان بر اساس کل سال مالی هستند.</p>
    <div className="mt-4 flex flex-wrap items-end gap-4">
      <div className="w-full min-w-0 sm:w-52"><label htmlFor="dashboard-from" className="text-sm font-medium">از تاریخ</label><DatePicker id="dashboard-from" value={from} onChange={setFrom} minDate={toPersian(startDate)} maxDate={toPersian(endDate)} calendar={persian} locale={persianFa} format="YYYY/MM/DD" inputClass={inputClass} containerClassName="w-full" editable={false} placeholder="انتخاب تاریخ شروع" /></div>
      <div className="w-full min-w-0 sm:w-52"><label htmlFor="dashboard-to" className="text-sm font-medium">تا تاریخ</label><DatePicker id="dashboard-to" value={to} onChange={setTo} minDate={toPersian(startDate)} maxDate={toPersian(endDate)} calendar={persian} locale={persianFa} format="YYYY/MM/DD" inputClass={inputClass} containerClassName="w-full" editable={false} placeholder="انتخاب تاریخ پایان" /></div>
      <button type="submit" className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">اعمال بازه</button>
      <button type="button" onClick={reset} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">کل سال مالی</button>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </form>;
}
