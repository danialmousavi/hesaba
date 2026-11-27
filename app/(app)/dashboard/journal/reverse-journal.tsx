"use client";

import { organizationFetch as fetch } from "@/lib/organization-fetch";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persianFa from "react-date-object/locales/persian_fa";
import gregorianEn from "react-date-object/locales/gregorian_en";

type Year = { id: string; name: string; startDate: string; endDate: string };
type Line = { id: string; account: { code: string; name: string }; debit: string; credit: string; description: string | null };
const persianDate = (date: string) => new DateObject({ date, format: "YYYY-MM-DD", calendar: gregorian, locale: gregorianEn }).convert(persian, persianFa);
const money = (value: string) => BigInt(value).toLocaleString("fa-IR");

export function ReverseJournal({ id, number, sourceDate, years, lines }: { id: string; number: number; sourceDate: string; years: Year[]; lines: Line[] }) {
  const router = useRouter();
  const dateId = useId();
  const inFlight = useRef(false);
  const [open, setOpen] = useState(false);
  const [yearId, setYearId] = useState(years[0]?.id ?? "");
  const [date, setDate] = useState<DateObject | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const year = years.find((item) => item.id === yearId);
  const minDate = year && (year.startDate > sourceDate ? year.startDate : sourceDate);

  async function create() {
    if (inFlight.current) return;
    if (!year || !date?.isValid) { setError("سال مالی و تاریخ برگشت را انتخاب کنید."); return; }
    const formattedDate = new DateObject(date).convert(gregorian, gregorianEn).format("YYYY-MM-DD");
    if (formattedDate < year.startDate || formattedDate > year.endDate || formattedDate < sourceDate) { setError("تاریخ باید در سال مالی انتخاب‌شده و در تاریخ سند اصلی یا پس از آن باشد."); return; }
    inFlight.current = true; setPending(true); setError("");
    try {
      const response = await fetch(`/api/journal-entries/${encodeURIComponent(id)}/reverse`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fiscalYearId: year.id, date: formattedDate }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "ایجاد پیش‌نویس برگشتی انجام نشد."); router.refresh(); return; }
      setSuccess(`پیش‌نویس برگشتی شمارهٔ ${result.entry.number} ایجاد شد. برای اثرگذاری آن را ثبت نهایی کنید.`);
      setOpen(false); router.refresh();
    } catch { setError("نتیجه درخواست مشخص نیست. فهرست اسناد را بررسی کنید؛ در صورت ساخته نشدن برگشتی دوباره تلاش کنید."); router.refresh(); }
    finally { inFlight.current = false; setPending(false); }
  }

  return <div className="mt-4 border-t border-slate-100 pt-4">
    {success && <p role="status" className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
    {!open ? <button type="button" onClick={() => { setOpen(true); setError(""); }} className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">پیش‌نمایش سند برگشتی</button> : <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
      <div><h3 className="font-semibold text-slate-900">پیش‌نمایش برگشت سند {number}</h3><p className="mt-2 text-sm leading-7 text-slate-600">بدهکار و بستانکار ردیف‌ها جابه‌جا می‌شوند. پیش‌نویس تا ثبت نهایی در گزارش‌ها اثری ندارد.</p></div>
      {years.length === 0 ? <p className="text-sm text-amber-800">سال مالی بازی برای تاریخ این سند وجود ندارد.</p> : <>
        <label className="block text-sm font-medium">سال مالی برگشت<select value={yearId} onChange={(event) => { setYearId(event.target.value); setDate(null); }} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{years.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <div className="text-sm font-medium"><label htmlFor={dateId}>تاریخ برگشت</label><DatePicker id={dateId} value={date} onChange={setDate} minDate={minDate ? persianDate(minDate) : undefined} maxDate={year ? persianDate(year.endDate) : undefined} calendar={persian} locale={persianFa} format="YYYY/MM/DD" inputClass="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" containerClassName="w-full" editable={false} placeholder="انتخاب تاریخ شمسی" /></div>
      </>}
      <div className="space-y-2" aria-label="ردیف‌های سند برگشتی">{lines.map((line) => <div key={line.id} className="rounded-lg bg-white p-3 text-sm leading-7"><p>{line.account.code} — {line.account.name}</p><p className="text-slate-600">بدهکار: {money(line.credit)} · بستانکار: {money(line.debit)} ریال</p>{line.description && <p className="text-slate-500">{line.description}</p>}</div>)}</div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2"><button type="button" onClick={create} disabled={pending || !year} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "در حال ایجاد…" : "ایجاد پیش‌نویس برگشتی"}</button><button type="button" disabled={pending} onClick={() => { setOpen(false); setError(""); }} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm">انصراف</button></div>
    </div>}
  </div>;
}
