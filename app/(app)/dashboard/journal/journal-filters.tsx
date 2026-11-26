"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persianFa from "react-date-object/locales/persian_fa";
import gregorianEn from "react-date-object/locales/gregorian_en";

type Year = { id: string; name: string; status: "OPEN" | "CLOSED" };
type Filters = { fiscalYearId?: string; status?: string; from?: string; to?: string; q?: string };
const field = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const toPersian = (value?: string) => value ? new DateObject({ date: value, format: "YYYY-MM-DD", calendar: gregorian, locale: gregorianEn }).convert(persian, persianFa) : null;
const toIso = (value: DateObject) => new DateObject(value).convert(gregorian, gregorianEn).format("YYYY-MM-DD");
const latinDigits = (value: string) => value.replace(/[۰-۹٠-٩]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".includes(digit) ? "۰۱۲۳۴۵۶۷۸۹".indexOf(digit) : "٠١٢٣٤٥٦٧٨٩".indexOf(digit)));

export function JournalFilters({ years, initial }: { years: Year[]; initial: Filters }) {
  const router = useRouter();
  const [year, setYear] = useState(initial.fiscalYearId ?? "");
  const [status, setStatus] = useState(initial.status ?? "");
  const [query, setQuery] = useState(initial.q ?? "");
  const [from, setFrom] = useState<DateObject | null>(() => toPersian(initial.from));
  const [to, setTo] = useState<DateObject | null>(() => toPersian(initial.to));
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const start = from && toIso(from), end = to && toIso(to);
    if (start && end && start > end) { setError("تاریخ شروع نباید بعد از تاریخ پایان باشد."); return; }
    const params = new URLSearchParams();
    if (year) params.set("fiscalYearId", year);
    if (status) params.set("status", status);
    if (start) params.set("from", start);
    if (end) params.set("to", end);
    if (query.trim()) params.set("q", latinDigits(query.trim()));
    setError(""); router.push(`/dashboard/journal?${params}`);
  }
  function reset() { setYear(""); setStatus(""); setQuery(""); setFrom(null); setTo(null); setError(""); router.push("/dashboard/journal"); }
  return <form onSubmit={submit} className="mt-5 space-y-4 rounded-xl bg-slate-50 p-4" aria-label="جست‌وجو و فیلتر اسناد">
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium">شرح یا شماره سند<input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} className={field} placeholder="جست‌وجو در اسناد" /></label>
      <label className="text-sm font-medium">سال مالی<select value={year} onChange={(event) => setYear(event.target.value)} className={field}><option value="">همه سال‌ها</option>{years.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.status === "OPEN" ? "باز" : "بسته"}</option>)}</select></label>
      <label className="text-sm font-medium">وضعیت<select value={status} onChange={(event) => setStatus(event.target.value)} className={field}><option value="">همه وضعیت‌ها</option><option value="DRAFT">پیش‌نویس</option><option value="POSTED">ثبت‌شده</option></select></label>
      <div className="text-sm font-medium"><label htmlFor="journal-filter-from">از تاریخ</label><DatePicker id="journal-filter-from" value={from} onChange={setFrom} calendar={persian} locale={persianFa} format="YYYY/MM/DD" inputClass={field} containerClassName="w-full" editable={false} placeholder="انتخاب تاریخ شروع" /></div>
      <div className="text-sm font-medium"><label htmlFor="journal-filter-to">تا تاریخ</label><DatePicker id="journal-filter-to" value={to} onChange={setTo} calendar={persian} locale={persianFa} format="YYYY/MM/DD" inputClass={field} containerClassName="w-full" editable={false} placeholder="انتخاب تاریخ پایان" /></div>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-2"><button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">اعمال فیلتر</button><button type="button" onClick={reset} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">پاک کردن فیلترها</button></div>
  </form>;
}
