"use client";

import { useEffect, useState } from "react";

type Month = { year: number; month: number; revenue: string; expenses: string };
const names = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const absolute = (value: bigint) => value < 0n ? -value : value;

export function MonthlyChart({ yearId }: { yearId: string }) {
  const [months, setMonths] = useState<Month[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/dashboard/monthly?fiscalYearId=${encodeURIComponent(yearId)}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "دریافت اطلاعات نمودار انجام نشد.");
        if (!controller.signal.aborted) setMonths(data.months);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "ارتباط با سرور برقرار نشد.");
      }
    }
    void load();
    return () => controller.abort();
  }, [yearId, attempt]);

  const max = (months ?? []).reduce((largest, item) => {
    const revenue = absolute(BigInt(item.revenue));
    const expenses = absolute(BigInt(item.expenses));
    return revenue > largest ? (revenue > expenses ? revenue : expenses) : (expenses > largest ? expenses : largest);
  }, 0n);

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="monthly-chart-title">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 id="monthly-chart-title" className="font-modam text-lg font-bold text-slate-900">درآمد و هزینه ماهانه</h2><p className="mt-1 text-xs leading-6 text-slate-500">خالص گردش اسناد نهایی، به تفکیک ماه شمسی و به ریال</p></div>
      <div className="flex gap-4 text-xs text-slate-600"><span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-emerald-600" />درآمد</span><span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-amber-500" />هزینه</span></div>
    </div>
    {error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error} <button type="button" onClick={() => { setError(""); setAttempt((value) => value + 1); }} className="font-semibold underline underline-offset-4">تلاش دوباره</button></p> : months === null ? <p role="status" className="mt-5 text-sm text-slate-500">در حال دریافت اطلاعات نمودار…</p> : months.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">برای این سال مالی گردش درآمد یا هزینه‌ای ثبت نشده است.</p> : <>
      <p className="mt-4 text-xs leading-6 text-slate-500">فقط ماه‌های دارای گردش نمایش داده شده‌اند. میله‌های سمت چپ صفر نشان‌دهنده مبلغ منفی هستند.</p>
      <div className="mt-4 space-y-5" role="list" aria-label="مقایسه درآمد و هزینه ماهانه">
        {months.map((item) => <div key={`${item.year}-${item.month}`} role="listitem" className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <h3 className="text-sm font-bold text-slate-800">{names[item.month - 1]} {item.year.toLocaleString("fa-IR")}</h3>
          <div className="mt-3 space-y-3"><Bar label="درآمد" value={item.revenue} max={max} color="bg-emerald-600" /><Bar label="هزینه" value={item.expenses} max={max} color="bg-amber-500" /></div>
        </div>)}
      </div>
    </>}
  </section>;
}

function Bar({ label, value, max, color }: { label: string; value: string; max: bigint; color: string }) {
  const amount = BigInt(value);
  const width = max === 0n ? 0 : Number(absolute(amount) * 10000n / max) / 100;
  return <div><div className="mb-1 flex flex-wrap justify-between gap-2 text-xs"><span className="text-slate-600">{label}</span><span className="font-semibold text-slate-800" dir="rtl">{amount.toLocaleString("fa-IR")} ریال</span></div>
    <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-200" dir="ltr" aria-hidden="true"><div className="flex w-1/2 justify-end border-r border-slate-400">{amount < 0n && <span className={color} style={{ width: `${width}%` }} />}</div><div className="w-1/2">{amount > 0n && <span className={`block h-full ${color}`} style={{ width: `${width}%` }} />}</div></div>
  </div>;
}
