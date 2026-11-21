"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persianFa from "react-date-object/locales/persian_fa";
import gregorianEn from "react-date-object/locales/gregorian_en";

export function FiscalYearForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [startDate, setStartDate] = useState<DateObject | null>(null);
  const [endDate, setEndDate] = useState<DateObject | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setMessage("");
    if (!startDate || !endDate || !startDate.isValid || !endDate.isValid) {
      setMessage("تاریخ شروع و پایان را انتخاب کنید.");
      return;
    }
    setPending(true);
    try {
      const toIso = (value: DateObject) => new DateObject(value).convert(gregorian, gregorianEn).format("YYYY-MM-DD");
      const response = await fetch("/api/fiscal-years", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: data.get("name"), startDate: toIso(startDate), endDate: toIso(endDate) }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error || "ثبت سال مالی انجام نشد."); return; }
      form.reset();
      setStartDate(null);
      setEndDate(null);
      router.refresh();
    } catch { setMessage("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setPending(false); }
  }
  const inputClass = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
  return <form onSubmit={submit} className="mt-5 space-y-4"><p className="text-xs leading-6 text-slate-500">تاریخ شروع و پایان را از تقویم شمسی انتخاب کنید.</p><label className="block text-sm font-medium">نام سال مالی<input className={inputClass} name="name" placeholder="مثلاً سال مالی ۱۴۰۵" minLength={2} maxLength={100} required /></label><div className="text-sm font-medium"><label htmlFor="fiscal-start">تاریخ شروع</label><DatePicker id="fiscal-start" value={startDate} onChange={setStartDate} calendar={persian} locale={persianFa} format="YYYY/MM/DD" inputClass={inputClass} containerClassName="w-full" placeholder="انتخاب تاریخ شروع" editable={false} /></div><div className="text-sm font-medium"><label htmlFor="fiscal-end">تاریخ پایان</label><DatePicker id="fiscal-end" value={endDate} onChange={setEndDate} calendar={persian} locale={persianFa} format="YYYY/MM/DD" inputClass={inputClass} containerClassName="w-full" placeholder="انتخاب تاریخ پایان" editable={false} /></div>{message && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>}<button disabled={pending} className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{pending ? "در حال ثبت…" : "ایجاد سال مالی"}</button></form>;
}
