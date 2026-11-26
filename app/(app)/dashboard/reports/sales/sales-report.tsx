"use client";

import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persianFa from "react-date-object/locales/persian_fa";
import gregorianEn from "react-date-object/locales/gregorian_en";

type Year = { id: string; name: string; status: "OPEN" | "CLOSED"; startDate: string; endDate: string };
type Filters = { fiscalYearId: string; customerId: string; from: string; to: string; asOf: string; paymentStatus: string; page: number };
type Report = { fiscalYear: Year; filters: { from: string; to: string; asOf: string }; totals: { count: string; subtotal: string; discount: string; tax: string; amount: string; paid: string; remaining: string }; rows: { id: string; number: number; date: string; customerName: string; journalEntryId: string; amount: string; paid: string; remaining: string; paymentStatus: "unpaid" | "partial" | "paid" }[]; page: number; pageSize: number };
const field = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const money = (value: string) => BigInt(value).toLocaleString("fa-IR");
const toPersian = (value: string) => new DateObject({ date: value, format: "YYYY-MM-DD", calendar: gregorian, locale: gregorianEn }).convert(persian, persianFa);
const toIso = (value: DateObject | null) => value?.isValid ? new DateObject(value).convert(gregorian, gregorianEn).format("YYYY-MM-DD") : "";
const showDate = (value: string) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));

export function SalesReport({ years, customers }: { years: Year[]; customers: { id: string; name: string; isActive: boolean }[] }) {
  const initial = years.find((year) => year.status === "OPEN") ?? years[0];
  const [yearId, setYearId] = useState(initial.id);
  const [customerId, setCustomerId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [from, setFrom] = useState<DateObject | null>(() => toPersian(initial.startDate));
  const [to, setTo] = useState<DateObject | null>(() => toPersian(initial.endDate));
  const [asOf, setAsOf] = useState<DateObject | null>(() => toPersian(initial.endDate));
  const [filters, setFilters] = useState<Filters>({ fiscalYearId: initial.id, customerId: "", from: initial.startDate, to: initial.endDate, asOf: initial.endDate, paymentStatus: "all", page: 1 });
  const [attempt, setAttempt] = useState(0);
  const [validation, setValidation] = useState("");
  const [result, setResult] = useState<{ key: string; data?: Report; error?: string } | null>(null);
  const fromId = useId(), toId = useId(), asOfId = useId();
  const year = years.find((item) => item.id === yearId)!;
  const query = new URLSearchParams({ fiscalYearId: filters.fiscalYearId, from: filters.from, to: filters.to, asOf: filters.asOf, paymentStatus: filters.paymentStatus, page: String(filters.page), pageSize: "15", ...(filters.customerId ? { customerId: filters.customerId } : {}) }).toString();
  const key = `${query}:${attempt}`;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try { const response = await fetch(`/api/reports/sales?${query}`, { cache: "no-store", signal: controller.signal }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "دریافت گزارش انجام نشد."); if (!controller.signal.aborted) setResult({ key, data: body }); }
      catch (error) { if (!controller.signal.aborted) setResult({ key, error: error instanceof Error ? error.message : "ارتباط با سرور برقرار نشد." }); }
    }
    void load(); return () => controller.abort();
  }, [query, key]);
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const start = toIso(from), end = toIso(to), cutoff = toIso(asOf);
    if (!start || !end || !cutoff || start < year.startDate || end > year.endDate || start > end || cutoff < end) { setValidation("بازه صدور باید داخل سال مالی باشد و تاریخ گزارش نباید پیش از پایان بازه باشد."); return; }
    setValidation(""); setFilters({ fiscalYearId: yearId, customerId, from: start, to: end, asOf: cutoff, paymentStatus, page: 1 });
  }
  const current = result?.key === key ? result : null;
  return <>
    <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">فاکتورهای صادرشده در بازه انتخابی نشان داده می‌شوند. دریافت و ابطال تا تاریخ گزارش بر اساس تاریخ حسابداری محاسبه می‌شوند؛ تاریخ گزارش می‌تواند پس از پایان سال مالی باشد.</p>
    <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
      <form onSubmit={apply} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="font-modam text-xl font-bold">فیلتر گزارش</h2>
        <label className="block text-sm font-medium">سال مالی<select className={field} value={yearId} onChange={(event) => { const selected = years.find((item) => item.id === event.target.value)!; setYearId(selected.id); setFrom(toPersian(selected.startDate)); setTo(toPersian(selected.endDate)); setAsOf(toPersian(selected.endDate)); setValidation(""); }}>{years.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.status === "OPEN" ? "باز" : "بسته"}</option>)}</select></label>
        <label className="block text-sm font-medium">مشتری<select className={field} value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">همه مشتریان</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.isActive ? "" : " (غیرفعال)"}</option>)}</select></label>
        <label className="block text-sm font-medium">وضعیت دریافت<select className={field} value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}><option value="all">همه فاکتورها</option><option value="unpaid">دریافت‌نشده</option><option value="partial">دریافت جزئی</option><option value="paid">تسویه‌شده</option></select></label>
        <div className="text-sm font-medium"><label htmlFor={fromId}>از تاریخ صدور</label><DatePicker id={fromId} value={from} onChange={setFrom} minDate={toPersian(year.startDate)} maxDate={toPersian(year.endDate)} calendar={persian} locale={persianFa} format="YYYY/MM/DD" inputClass={field} containerClassName="w-full" editable={false} /></div>
        <div className="text-sm font-medium"><label htmlFor={toId}>تا تاریخ صدور</label><DatePicker id={toId} value={to} onChange={setTo} minDate={toPersian(year.startDate)} maxDate={toPersian(year.endDate)} calendar={persian} locale={persianFa} format="YYYY/MM/DD" inputClass={field} containerClassName="w-full" editable={false} /></div>
        <div className="text-sm font-medium"><label htmlFor={asOfId}>محاسبه مانده تا تاریخ</label><DatePicker id={asOfId} value={asOf} onChange={setAsOf} minDate={toPersian(year.startDate)} calendar={persian} locale={persianFa} format="YYYY/MM/DD" inputClass={field} containerClassName="w-full" editable={false} /></div>
        {validation && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm leading-7 text-red-700">{validation}</p>}
        <button className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800">نمایش گزارش</button>
      </form>
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="font-modam text-xl font-bold">نتیجه گزارش</h2>
        {!current ? <p role="status" className="mt-5 text-sm text-slate-600">در حال دریافت گزارش…</p> : current.error ? <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{current.error} <button type="button" onClick={() => setAttempt((value) => value + 1)} className="font-semibold underline">تلاش دوباره</button></p> : current.data && <div className="mt-5">
          <p className="text-sm leading-7 text-slate-500">{current.data.fiscalYear.name} · صدور از {showDate(current.data.filters.from)} تا {showDate(current.data.filters.to)} · مانده تا {showDate(current.data.filters.asOf)}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{([["تعداد فاکتورها", money(current.data.totals.count), ""], ["جمع فروش", money(current.data.totals.amount), "ریال"], ["دریافت‌شده", money(current.data.totals.paid), "ریال"], ["مانده دریافتنی", money(current.data.totals.remaining), "ریال"], ["جمع تخفیف", money(current.data.totals.discount), "ریال"], ["جمع مالیات", money(current.data.totals.tax), "ریال"]] as const).map(([label, value, unit]) => <div key={label} className="min-w-0 rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 break-words text-lg font-bold text-slate-900">{value} <span className="text-xs font-normal">{unit}</span></p></div>)}</div>
          <p className="mt-4 text-xs leading-6 text-slate-500">جمع‌ها مربوط به همه نتایج فیلترشده‌اند، نه فقط صفحه فعلی.</p>
          {current.data.rows.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">فاکتوری با این شرایط پیدا نشد.</p> : <ul className="mt-4 space-y-3">{current.data.rows.map((row) => <li key={row.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="break-words font-semibold">{row.customerName} · فاکتور شماره {row.number.toLocaleString("fa-IR")}</h3><p className="mt-2 text-sm text-slate-500">{showDate(row.date)}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{row.paymentStatus === "paid" ? "تسویه‌شده" : row.paymentStatus === "partial" ? "دریافت جزئی" : "دریافت‌نشده"}</span></div><div className="mt-4 grid gap-2 text-sm leading-7 text-slate-700 sm:grid-cols-3"><p>مبلغ: {money(row.amount)} ریال</p><p>دریافت‌شده: {money(row.paid)} ریال</p><p className="font-semibold">مانده: {money(row.remaining)} ریال</p></div><Link href={`/dashboard/journal#journal-${row.journalEntryId}`} className="mt-3 inline-block text-sm font-semibold text-emerald-700 underline">مشاهده سند حسابداری</Link></li>)}</ul>}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={filters.page <= 1} onClick={() => setFilters((value) => ({ ...value, page: value.page - 1 }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">صفحه قبل</button><span className="text-sm text-slate-600">صفحه {filters.page.toLocaleString("fa-IR")} از {(BigInt(current.data.totals.count) === 0n ? 1n : (BigInt(current.data.totals.count) + BigInt(current.data.pageSize) - 1n) / BigInt(current.data.pageSize)).toLocaleString("fa-IR")}</span><button type="button" disabled={BigInt(filters.page * current.data.pageSize) >= BigInt(current.data.totals.count)} onClick={() => setFilters((value) => ({ ...value, page: value.page + 1 }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">صفحه بعد</button></div>
        </div>}
      </section>
    </div>
  </>;
}
