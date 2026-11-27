"use client";

import { organizationFetch as fetch } from "@/lib/organization-fetch";

import { useState, type FormEvent } from "react";
import { CsvDownload } from "../csv-download";

type Year = { id: string; name: string; status: "OPEN" | "CLOSED" };
type Report = { fiscalYear: { name: string }; rows: { id: string; code: string; name: string; type: "REVENUE" | "EXPENSE"; net: string }[]; totals: { revenue: string; expenses: string; profit: string } };
const format = (value: string) => BigInt(value).toLocaleString("fa-IR");

export function ProfitLoss({ years }: { years: Year[] }) {
  const [selected, setSelected] = useState(years.find((year) => year.status === "OPEN")?.id ?? years[0].id);
  const [report, setReport] = useState<Report | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setReport(null);
    try {
      const response = await fetch(`/api/reports/profit-loss?fiscalYearId=${encodeURIComponent(selected)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "دریافت گزارش انجام نشد."); return; }
      setReport(data);
    } catch { setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setPending(false); }
  }
  const profit = report ? BigInt(report.totals.profit) : 0n;
  return <div className="mt-8 space-y-6"><form onSubmit={submit} className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><label className="min-w-60 flex-1 text-sm font-medium sm:max-w-sm">سال مالی<select value={selected} disabled={pending} onChange={(event) => { setSelected(event.target.value); setReport(null); setError(""); }} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100">{years.map((year) => <option key={year.id} value={year.id}>{year.name} · {year.status === "OPEN" ? "باز" : "بسته"}</option>)}</select></label><button disabled={pending} className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{pending ? "در حال دریافت…" : "نمایش گزارش"}</button></form>{error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {report && <section className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-modam text-xl font-bold">عملکرد {report.fiscalYear.name}</h2><div className="flex flex-wrap items-center gap-3"><span className="text-xs text-slate-500">مبالغ به ریال</span><CsvDownload url={`/api/reports/profit-loss/csv?${new URLSearchParams({ fiscalYearId: selected })}`} filename="profit-loss.csv" /></div></div><p className="text-xs leading-6 text-slate-500">گردش مستقیم حساب‌ها نمایش داده می‌شود و زیرحساب‌ها دوباره در والد جمع نمی‌شوند.</p><div className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">خالص درآمد</p><p className="mt-3 text-xl font-semibold">{format(report.totals.revenue)} ریال</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">خالص هزینه</p><p className="mt-3 text-xl font-semibold">{format(report.totals.expenses)} ریال</p></div><div className={profit < 0n ? "rounded-2xl border border-red-200 bg-red-50 p-5" : "rounded-2xl border border-emerald-200 bg-emerald-50 p-5"}><p className="text-sm text-slate-600">{profit < 0n ? "زیان" : profit > 0n ? "سود" : "سود و زیان"}</p><p className="mt-3 text-xl font-semibold">{(profit < 0n ? -profit : profit).toLocaleString("fa-IR")} ریال</p></div></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-modam text-lg font-bold">جزئیات حساب‌ها</h3>{report.rows.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">برای این سال مالی درآمد یا هزینهٔ ثبت‌شده‌ای وجود ندارد.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[520px] text-right text-sm"><caption className="sr-only">ماندهٔ خالص حساب‌های درآمد و هزینه به ریال</caption><thead className="bg-slate-50 text-slate-600"><tr><th scope="col" className="p-3">کد</th><th scope="col" className="p-3">حساب</th><th scope="col" className="p-3">نوع</th><th scope="col" className="p-3">ماندهٔ خالص</th></tr></thead><tbody>{report.rows.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="p-3" dir="ltr">{row.code}</td><th scope="row" className="p-3 font-medium">{row.name}</th><td className="p-3">{row.type === "REVENUE" ? "درآمد" : "هزینه"}</td><td className="p-3">{format(row.net)}</td></tr>)}</tbody></table></div>}</div></section>}
  </div>;
}
