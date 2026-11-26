"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Sales = { fiscalYear: { name: string; endDate: string }; totals: { count: string; amount: string }; months: { year: number; month: number; count: string; amount: string }[] };
const names = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const money = (value: string) => BigInt(value).toLocaleString("fa-IR");
const formatDate = (value: string) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));

export function SalesOverview({ yearId }: { yearId: string }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: Sales; error?: string } | null>(null);
  const key = `${yearId}:${attempt}`;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/dashboard/sales?fiscalYearId=${encodeURIComponent(yearId)}`, { cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "دریافت آمار فروش انجام نشد.");
        if (!controller.signal.aborted) setResult({ key, data: body });
      } catch (error) { if (!controller.signal.aborted) setResult({ key, error: error instanceof Error ? error.message : "ارتباط با سرور برقرار نشد." }); }
    }
    void load(); return () => controller.abort();
  }, [yearId, key]);
  const current = result?.key === key ? result : null;
  const max = (current?.data?.months ?? []).reduce((largest, month) => BigInt(month.amount) > largest ? BigInt(month.amount) : largest, 0n);
  return <section aria-labelledby="sales-overview-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="sales-overview-title" className="font-modam text-lg font-bold text-slate-900">فروش و فاکتورها</h2><p className="mt-1 text-xs leading-6 text-slate-500">فاکتورهای فروش معتبر سال مالی انتخاب‌شده</p></div><Link href="/dashboard/reports/sales" className="text-sm font-semibold text-emerald-700 underline underline-offset-4">گزارش فروش و مطالبات</Link></div>
    {!current ? <p role="status" className="mt-5 text-sm text-slate-600">در حال دریافت آمار فروش…</p> : current.error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm leading-7 text-red-700">{current.error} <button type="button" onClick={() => setAttempt((value) => value + 1)} className="font-semibold underline underline-offset-4">تلاش دوباره</button></p> : current.data && <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="min-w-0 rounded-xl bg-emerald-50 p-4"><p className="text-sm text-emerald-800">تعداد فاکتورها</p><p className="mt-2 break-words text-2xl font-bold text-emerald-950">{money(current.data.totals.count)}</p></div><div className="min-w-0 rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-600">مبلغ فروش فاکتورها</p><p className="mt-2 break-words text-2xl font-bold text-slate-900">{money(current.data.totals.amount)} <span className="text-sm font-normal">ریال</span></p></div></div>
      <p className="mt-3 text-xs leading-6 text-slate-500">مبالغ پس از تخفیف و با مالیات، مستقل از دریافت وجه هستند. اعتبار فاکتورها تا پایان سال مالی ({formatDate(current.data.fiscalYear.endDate)}) بر اساس تاریخ حسابداری بررسی می‌شود.</p>
      <div className="mt-6"><h3 className="font-modam text-base font-bold text-slate-900">فروش ماهانه</h3>{current.data.months.length === 0 ? <p className="mt-3 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">برای این سال مالی فاکتور فروش معتبری وجود ندارد.</p> : <><p className="mt-2 text-xs leading-6 text-slate-500">ماه‌های دارای فاکتور نمایش داده می‌شوند؛ هر میله نسبت به بیشترین فروش ماهانه همین سال است.</p><ul className="mt-4 space-y-4" aria-label="فروش فاکتورها به تفکیک ماه شمسی">{current.data.months.map((month) => {
        const width = max > 0n ? Number(BigInt(month.amount) * 10000n / max) / 100 : 0;
        return <li key={`${month.year}-${month.month}`} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><h4 className="font-semibold text-slate-800">{names[month.month - 1]} {month.year.toLocaleString("fa-IR")}</h4><span className="text-xs text-slate-500">{money(month.count)} فاکتور</span></div><p className="mt-2 break-words text-sm font-bold text-slate-800">{money(month.amount)} ریال</p><div aria-hidden="true" className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${width}%` }} /></div></li>;
      })}</ul></>}</div>
    </>}
  </section>;
}
