"use client";

import { useState, type FormEvent } from "react";

type Amounts = { debit: string; credit: string; debitBalance: string; creditBalance: string };
type Report = { fiscalYear: { id: string; name: string }; rows: (Amounts & { id: string; code: string; name: string })[]; totals: Amounts };
type Year = { id: string; name: string; status: "OPEN" | "CLOSED" };
const format = (value: string) => BigInt(value).toLocaleString("fa-IR");

export function TrialBalance({ years }: { years: Year[] }) {
  const [selected, setSelected] = useState(years.find((year) => year.status === "OPEN")?.id ?? years[0].id);
  const [report, setReport] = useState<Report | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError(""); setReport(null);
    try {
      const response = await fetch(`/api/reports/trial-balance?fiscalYearId=${encodeURIComponent(selected)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "دریافت گزارش انجام نشد."); return; }
      setReport(data);
    } catch { setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setPending(false); }
  }

  return <div className="mt-8 space-y-6"><form onSubmit={submit} className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><label className="min-w-60 flex-1 text-sm font-medium sm:max-w-sm">سال مالی<select value={selected} disabled={pending} onChange={(event) => { setSelected(event.target.value); setReport(null); setError(""); }} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100">{years.map((year) => <option key={year.id} value={year.id}>{year.name} · {year.status === "OPEN" ? "باز" : "بسته"}</option>)}</select></label><button disabled={pending} className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{pending ? "در حال دریافت…" : "نمایش گزارش"}</button></form>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {report && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-modam text-xl font-bold">تراز آزمایشی · {report.fiscalYear.name}</h2><span className="text-xs text-slate-500">مبالغ به ریال</span></div><p className="mt-2 text-xs leading-6 text-slate-500">فقط حساب‌های دارای گردش نمایش داده می‌شوند؛ گردش زیرحساب‌ها در حساب والد جمع نشده است.</p>{report.rows.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">برای این سال مالی گردش ثبت‌شده‌ای وجود ندارد.</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-right text-sm"><caption className="sr-only">گردش و ماندهٔ حساب‌های دارای گردش به ریال</caption><thead className="bg-slate-50 text-slate-600"><tr><th scope="col" className="p-3">کد</th><th scope="col" className="p-3">حساب</th><th scope="col" className="p-3">گردش بدهکار</th><th scope="col" className="p-3">گردش بستانکار</th><th scope="col" className="p-3">مانده بدهکار</th><th scope="col" className="p-3">مانده بستانکار</th></tr></thead><tbody>{report.rows.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="p-3" dir="ltr">{row.code}</td><th scope="row" className="p-3 font-medium">{row.name}</th><td className="p-3">{format(row.debit)}</td><td className="p-3">{format(row.credit)}</td><td className="p-3">{format(row.debitBalance)}</td><td className="p-3">{format(row.creditBalance)}</td></tr>)}</tbody><tfoot className="bg-emerald-50 font-semibold text-emerald-950"><tr><th colSpan={2} className="p-3">جمع کل</th><td className="p-3">{format(report.totals.debit)}</td><td className="p-3">{format(report.totals.credit)}</td><td className="p-3">{format(report.totals.debitBalance)}</td><td className="p-3">{format(report.totals.creditBalance)}</td></tr></tfoot></table></div>}</section>}
  </div>;
}
