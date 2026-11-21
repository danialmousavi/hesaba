"use client";

import { useState, type FormEvent } from "react";

type Amounts = { debit: string; credit: string; debitBalance: string; creditBalance: string };
type Report = { fiscalYear: { name: string }; account: { name: string; code: string }; rows: (Amounts & { id: string; description: string | null; entry: { number: number; date: string; description: string } })[]; totals: Amounts };
type Year = { id: string; name: string; status: "OPEN" | "CLOSED" };
type Account = { id: string; name: string; code: string; isActive: boolean };
const format = (value: string) => BigInt(value).toLocaleString("fa-IR");
const dateFormat = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "UTC" });
const selectClass = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";

export function GeneralLedger({ years, accounts }: { years: Year[]; accounts: Account[] }) {
  const [year, setYear] = useState(years.find((item) => item.status === "OPEN")?.id ?? years[0].id);
  const [account, setAccount] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account) { setError("حساب را انتخاب کنید."); return; }
    setPending(true); setError(""); setReport(null);
    try {
      const params = new URLSearchParams({ fiscalYearId: year, accountId: account });
      const response = await fetch(`/api/reports/general-ledger?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "دریافت گزارش انجام نشد."); return; }
      setReport(data);
    } catch { setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setPending(false); }
  }

  return <div className="mt-8 space-y-6"><form onSubmit={submit} className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><label className="min-w-60 flex-1 text-sm font-medium">سال مالی<select value={year} disabled={pending} onChange={(event) => { setYear(event.target.value); setReport(null); setError(""); }} className={selectClass}>{years.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.status === "OPEN" ? "باز" : "بسته"}</option>)}</select></label><label className="min-w-60 flex-1 text-sm font-medium">حساب<select value={account} disabled={pending} onChange={(event) => { setAccount(event.target.value); setReport(null); setError(""); }} className={selectClass} required><option value="">انتخاب حساب</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}{item.isActive ? "" : " (غیرفعال)"}</option>)}</select></label><button disabled={pending} className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{pending ? "در حال دریافت…" : "نمایش گزارش"}</button></form>{error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {report && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-modam text-xl font-bold">{report.account.code} — {report.account.name} · {report.fiscalYear.name}</h2><span className="text-xs text-slate-500">مبالغ به ریال</span></div><p className="mt-2 text-xs leading-6 text-slate-500">فقط گردش مستقیم این حساب از سندهای نهایی نمایش داده می‌شود؛ زیرحساب‌ها جداگانه‌اند.</p>{report.rows.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">برای این حساب در سال مالی انتخاب‌شده گردش ثبت‌شده‌ای وجود ندارد.</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[850px] text-right text-sm"><caption className="sr-only">گردش حساب و ماندهٔ تجمعی به ریال</caption><thead className="bg-slate-50 text-slate-600"><tr><th scope="col" className="p-3">تاریخ</th><th scope="col" className="p-3">سند</th><th scope="col" className="p-3">شرح</th><th scope="col" className="p-3">بدهکار</th><th scope="col" className="p-3">بستانکار</th><th scope="col" className="p-3">مانده بدهکار</th><th scope="col" className="p-3">مانده بستانکار</th></tr></thead><tbody>{report.rows.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="p-3 whitespace-nowrap">{dateFormat.format(new Date(row.entry.date))}</td><td className="p-3">{row.entry.number.toLocaleString("fa-IR")}</td><td className="p-3">{row.description || row.entry.description}</td><td className="p-3">{format(row.debit)}</td><td className="p-3">{format(row.credit)}</td><td className="p-3">{format(row.debitBalance)}</td><td className="p-3">{format(row.creditBalance)}</td></tr>)}</tbody><tfoot className="bg-emerald-50 font-semibold text-emerald-950"><tr><th colSpan={3} className="p-3">جمع گردش و ماندهٔ پایان</th><td className="p-3">{format(report.totals.debit)}</td><td className="p-3">{format(report.totals.credit)}</td><td className="p-3">{format(report.totals.debitBalance)}</td><td className="p-3">{format(report.totals.creditBalance)}</td></tr></tfoot></table></div>}</section>}
  </div>;
}
