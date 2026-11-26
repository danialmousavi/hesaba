"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { Year } from "./types";

type Entry = { id: string; type: "INCOME" | "EXPENSE"; date: string; amount: string; description: string; paymentMethod: "CASH" | "BANK_TRANSFER" | "OTHER"; fiscalYear: { name: string }; categoryAccount: { code: string; name: string }; settlementAccount: { code: string; name: string }; journalEntry: { id: string; number: number } | null };
type Result = { transactions: Entry[]; total: number; page: number; pageSize: number };
type Filters = { fiscalYearId: string; type: string; search: string; page: number };
const field = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const dateFormat = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "UTC" });
const methods = { CASH: "نقدی", BANK_TRANSFER: "انتقال بانکی", OTHER: "سایر" } as const;

export function PostedList({ years, revision }: { years: Year[]; revision: number }) {
  const [year, setYear] = useState("");
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({ fiscalYearId: "", type: "all", search: "", page: 1 });
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: Result; error?: string } | null>(null);
  const params = new URLSearchParams({ type: filters.type, search: filters.search, page: String(filters.page) });
  if (filters.fiscalYearId) params.set("fiscalYearId", filters.fiscalYearId);
  const query = params.toString(), key = `${query}:${revision}:${attempt}`;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/transactions/posted?${query}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "دریافت درآمد و هزینه‌های ثبت‌شده انجام نشد.");
        if (!controller.signal.aborted) setResult({ key, data });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ key, error: error instanceof Error ? error.message : "ارتباط با سرور برقرار نشد." });
      }
    }
    void load();
    return () => controller.abort();
  }, [query, key]);

  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFilters({ fiscalYearId: year, type, search: search.trim(), page: 1 });
  }
  const current = result?.key === key ? result : null;
  return <section aria-labelledby="posted-transactions-title" className="mt-6 min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <h2 id="posted-transactions-title" className="font-modam text-xl font-bold">درآمد و هزینه‌های ثبت‌شده</h2>
    <p className="mt-2 text-sm leading-7 text-slate-600">این فهرست جدا از پیش‌نویس‌هاست و رویدادهای ثبت‌نهایی‌شده و سند حسابداری مرتبط را نشان می‌دهد.</p>
    <form onSubmit={filter} className="mt-5 grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="فیلتر رویدادهای ثبت‌شده">
      <label className="block text-sm font-medium">سال مالی<select value={year} onChange={(event) => setYear(event.target.value)} className={field}><option value="">همه سال‌ها</option>{years.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.status === "OPEN" ? "باز" : "بسته"}</option>)}</select></label>
      <label className="block text-sm font-medium">نوع<select value={type} onChange={(event) => setType(event.target.value)} className={field}><option value="all">همه</option><option value="income">درآمد</option><option value="expense">هزینه</option></select></label>
      <label className="block text-sm font-medium">جست‌وجوی شرح<input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={150} className={field} /></label>
      <button className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">جست‌وجو</button>
    </form>
    {!current ? <p role="status" className="mt-6 text-sm text-slate-600">در حال دریافت رویدادهای ثبت‌شده…</p> : current.error ? <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{current.error} <button type="button" onClick={() => setAttempt((value) => value + 1)} className="font-semibold underline underline-offset-4">تلاش دوباره</button></p> : current.data && <div className="mt-6">
      <p className="text-sm text-slate-500">{current.data.total.toLocaleString("fa-IR")} رویداد ثبت‌شده</p>
      {current.data.transactions.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">رویداد ثبت‌شده‌ای با این شرایط پیدا نشد.</p> : <ul className="mt-4 space-y-3">{current.data.transactions.map((item) => <li key={item.id} className="rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-semibold text-slate-900">{item.description}</h3><p className="mt-2 text-sm text-slate-600">{item.type === "INCOME" ? "درآمد" : "هزینه"} · {dateFormat.format(new Date(item.date))} · {item.fiscalYear.name}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">ثبت‌شده</span></div>
        <p className="mt-4 break-words text-lg font-bold text-slate-900">{BigInt(item.amount).toLocaleString("fa-IR")} ریال</p>
        <dl className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-3"><div><dt className="text-slate-500">حساب {item.type === "INCOME" ? "درآمد" : "هزینه"}</dt><dd className="mt-1 break-words"><bdi>{item.categoryAccount.code}</bdi> — {item.categoryAccount.name}</dd></div><div><dt className="text-slate-500">حساب تسویه</dt><dd className="mt-1 break-words"><bdi>{item.settlementAccount.code}</bdi> — {item.settlementAccount.name}</dd></div><div><dt className="text-slate-500">روش دریافت یا پرداخت</dt><dd className="mt-1">{methods[item.paymentMethod]}</dd></div></dl>
        {item.journalEntry ? <Link href={`/dashboard/journal#journal-${item.journalEntry.id}`} className="mt-4 inline-block text-sm font-semibold text-emerald-700 underline underline-offset-4">مشاهده سند شماره {item.journalEntry.number.toLocaleString("fa-IR")}</Link> : <p className="mt-4 text-sm text-red-700">سند مرتبط در دسترس نیست.</p>}
      </li>)}</ul>}
      <nav aria-label="صفحه‌بندی رویدادهای ثبت‌شده" className="mt-5 flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={current.data.page <= 1} onClick={() => setFilters((value) => ({ ...value, page: value.page - 1 }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">صفحه قبل</button><span className="text-sm text-slate-600">صفحه {current.data.page.toLocaleString("fa-IR")} از {Math.max(1, Math.ceil(current.data.total / current.data.pageSize)).toLocaleString("fa-IR")}</span><button type="button" disabled={current.data.page * current.data.pageSize >= current.data.total} onClick={() => setFilters((value) => ({ ...value, page: value.page + 1 }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">صفحه بعد</button></nav>
    </div>}
  </section>;
}
