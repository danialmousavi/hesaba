"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MonthlyChart } from "./monthly-chart";
import { SalesOverview } from "./sales-overview";
import { BalanceOverview } from "./balance-overview";

type Year = { id: string; name: string; status: "OPEN" | "CLOSED" };
type Summary = {
  fiscalYear: { name: string }; revenue: string; expenses: string; profit: string;
  postedCount: number; draftCount: number;
  recentPosted: { id: string; number: number; date: string; description: string }[];
};
const amount = (value: string) => BigInt(value).toLocaleString("fa-IR");
const dateFormat = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "UTC" });

export function DashboardSummary({ years, cashAccounts }: { years: Year[]; cashAccounts: { id: string; code: string; name: string; isActive: boolean }[] }) {
  const [year, setYear] = useState(years.find((item) => item.status === "OPEN")?.id ?? years[0].id);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/dashboard/summary?fiscalYearId=${encodeURIComponent(year)}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "دریافت خلاصه مالی انجام نشد.");
        if (!controller.signal.aborted) setSummary(data);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "ارتباط با سرور برقرار نشد.");
      }
    }
    void load();
    return () => controller.abort();
  }, [year, attempt]);
  const profit = summary ? BigInt(summary.profit) : 0n;

  return <div className="mt-8 space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div><h2 className="font-modam text-lg font-bold text-slate-900">خلاصه عملکرد</h2><p className="mt-1 text-sm text-slate-500">اطلاعات بر اساس سال مالی انتخاب‌شده</p></div>
      <label className="w-full text-sm font-medium text-slate-700 sm:w-64">سال مالی<select value={year} onChange={(event) => { setYear(event.target.value); setSummary(null); setError(""); }} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100">{years.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.status === "OPEN" ? "باز" : "بسته"}</option>)}</select></label>
    </div>
    <SalesOverview key={year} yearId={year} />
    <BalanceOverview yearId={year} accounts={cashAccounts} />
    {error ? <div role="alert" className="rounded-xl bg-red-50 p-5 text-sm text-red-700">{error} <button type="button" onClick={() => { setError(""); setSummary(null); setAttempt((value) => value + 1); }} className="font-semibold underline underline-offset-4">تلاش دوباره</button></div> : !summary ? <p role="status" className="rounded-xl bg-white p-6 text-sm text-slate-600">در حال دریافت اطلاعات داشبورد…</p> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric title="خالص درآمد" value={`${amount(summary.revenue)} ریال`} detail="اسناد نهایی سال مالی" />
        <Metric title="خالص هزینه" value={`${amount(summary.expenses)} ریال`} detail="اسناد نهایی سال مالی" />
        <Metric title={profit < 0n ? "زیان" : profit > 0n ? "سود" : "سود و زیان"} value={`${(profit < 0n ? -profit : profit).toLocaleString("fa-IR")} ریال`} detail="درآمد منهای هزینه" highlight={profit < 0n ? "loss" : "profit"} />
      </div>
      <p className="text-xs leading-6 text-slate-500">مبالغ بر اساس گردش مستقیم حساب‌های درآمد و هزینه در اسناد نهایی کل سال مالی محاسبه شده‌اند؛ ردیف‌های بستن حساب‌های موقت در عملکرد لحاظ نمی‌شوند.</p>
      <MonthlyChart key={year} yearId={year} />
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-modam text-lg font-bold">آخرین اسناد نهایی</h2><p className="mt-1 text-xs text-slate-500">تا پنج سند بر اساس تاریخ سند</p></div><Link href="/dashboard/journal" className="text-sm font-semibold text-emerald-700 underline underline-offset-4">همه اسناد</Link></div>
          {summary.recentPosted.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">هنوز سند نهایی برای این سال مالی ثبت نشده است.</p> : <ul className="mt-4 divide-y divide-slate-100">{summary.recentPosted.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-4"><div className="min-w-0"><p className="text-sm font-semibold text-slate-800">سند شماره {entry.number.toLocaleString("fa-IR")}</p><p className="mt-1 break-words text-sm text-slate-500">{entry.description || "بدون شرح"}</p></div><time className="text-sm text-slate-500" dateTime={entry.date}>{dateFormat.format(new Date(entry.date))}</time></li>)}</ul>}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-modam text-lg font-bold">وضعیت اسناد</h2><p className="mt-1 text-xs text-slate-500">{summary.fiscalYear.name}</p><dl className="mt-5 space-y-3"><div className="flex justify-between rounded-xl bg-emerald-50 p-4 text-sm"><dt className="text-emerald-800">نهایی‌شده</dt><dd className="font-bold text-emerald-900">{summary.postedCount.toLocaleString("fa-IR")}</dd></div><div className="flex justify-between rounded-xl bg-amber-50 p-4 text-sm"><dt className="text-amber-800">پیش‌نویس</dt><dd className="font-bold text-amber-900">{summary.draftCount.toLocaleString("fa-IR")}</dd></div></dl><Link href="/dashboard/reports/profit-loss" className="mt-5 inline-block text-sm font-semibold text-emerald-700 underline underline-offset-4">مشاهده گزارش سود و زیان</Link></section>
      </div>
    </>}
  </div>;
}

function Metric({ title, value, detail, highlight }: { title: string; value: string; detail: string; highlight?: "profit" | "loss" }) {
  const colors = highlight === "loss" ? "border-red-200 bg-red-50" : highlight === "profit" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white";
  return <div className={`min-w-0 rounded-2xl border p-5 shadow-sm ${colors}`}><p className="text-sm text-slate-600">{title}</p><p className="mt-4 break-words text-xl font-bold text-slate-900">{value}</p><p className="mt-2 text-xs text-slate-500">{detail}</p></div>;
}
