"use client";

import { organizationFetch as fetch } from "@/lib/organization-fetch";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { Account, Draft, Year } from "./types";
import { TransactionForm } from "./transaction-form";

type Filters = { fiscalYearId: string; type: string; search: string; page: number };
type Result = { transactions: Draft[]; total: number; page: number; pageSize: number };
const field = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const dateFormat = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "UTC" });
const methodLabels = { CASH: "نقدی", BANK_TRANSFER: "انتقال بانکی", OTHER: "سایر" } as const;

export function DraftList({ years, accounts, canWrite, revision, onChanged }: { years: Year[]; accounts: Account[]; canWrite: boolean; revision: number; onChanged: () => void }) {
  const [filters, setFilters] = useState<Filters>({ fiscalYearId: "", type: "all", search: "", page: 1 });
  const [year, setYear] = useState("");
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: Result; error?: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const [journalNumber, setJournalNumber] = useState<number | null>(null);
  const params = new URLSearchParams({ type: filters.type, search: filters.search, page: String(filters.page) });
  if (filters.fiscalYearId) params.set("fiscalYearId", filters.fiscalYearId);
  const query = params.toString();
  const key = `${query}:${revision}:${attempt}`;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/transactions?${query}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "دریافت پیش‌نویس‌ها انجام نشد.");
        if (!controller.signal.aborted) setResult({ key, data });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ key, error: error instanceof Error ? error.message : "ارتباط با سرور برقرار نشد." });
      }
    }
    void load();
    return () => controller.abort();
  }, [query, key]);

  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setActionError(""); setSuccess(""); setJournalNumber(null); setConfirmId(null); setPreviewId(null); setEditId(null);
    setFilters({ fiscalYearId: year, type, search: search.trim(), page: 1 });
  }
  async function remove(id: string) {
    setPending(true); setActionError(""); setSuccess(""); setJournalNumber(null);
    try {
      const response = await fetch(`/api/transactions/${encodeURIComponent(id)}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) { setActionError(body.error || "حذف پیش‌نویس انجام نشد."); return; }
      setConfirmId(null); setSuccess("پیش‌نویس حذف شد.");
      if (result?.key === key && result.data?.transactions.length === 1 && filters.page > 1) setFilters((value) => ({ ...value, page: value.page - 1 }));
      onChanged();
    } catch { setActionError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setPending(false); }
  }

  async function post(id: string) {
    setPending(true); setActionError(""); setSuccess(""); setJournalNumber(null);
    try {
      const response = await fetch(`/api/transactions/${encodeURIComponent(id)}/post`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) { setActionError(response.status >= 500 ? "نتیجه ثبت نهایی نامشخص است؛ پیش از تلاش دوباره، فهرست اسناد را بررسی کنید." : body.error || "ثبت نهایی انجام نشد."); return; }
      setPreviewId(null); setJournalNumber(body.journal.number); setSuccess("ثبت نهایی انجام شد و پیش‌نویس از این فهرست خارج شد.");
      if (result?.key === key && result.data?.transactions.length === 1 && filters.page > 1) setFilters((value) => ({ ...value, page: value.page - 1 }));
      onChanged();
    } catch { setActionError("پاسخ ثبت نهایی دریافت نشد. پیش از تلاش دوباره، وضعیت سند را در فهرست اسناد بررسی کنید."); }
    finally { setPending(false); }
  }

  const current = result?.key === key ? result : null;
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <h2 className="font-modam text-xl font-bold">پیش‌نویس‌ها</h2>
    <p className="mt-2 text-xs leading-6 text-slate-500">فهرست فقط پیش‌نویس‌های درآمد و هزینه را نمایش می‌دهد.</p>
    <form onSubmit={filter} className="mt-5 grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <label className="block text-sm font-medium">سال مالی<select value={year} onChange={(event) => setYear(event.target.value)} className={field}><option value="">همه سال‌ها</option>{years.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.status === "OPEN" ? "باز" : "بسته"}</option>)}</select></label>
      <label className="block text-sm font-medium">نوع<select value={type} onChange={(event) => setType(event.target.value)} className={field}><option value="all">همه</option><option value="income">درآمد</option><option value="expense">هزینه</option></select></label>
      <label className="block text-sm font-medium">جست‌وجوی شرح<input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={150} className={field} /></label>
      <button disabled={pending} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">جست‌وجو</button>
    </form>
    {success && <p role="status" className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">{success}{journalNumber !== null && <> شماره سند: {journalNumber.toLocaleString("fa-IR")} · <Link href="/dashboard/journal" className="font-semibold underline underline-offset-4">مشاهده اسناد</Link></>}</p>}
    {actionError && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-700">{actionError} <Link href="/dashboard/journal" className="font-semibold underline underline-offset-4">فهرست اسناد</Link> · <button type="button" disabled={pending} onClick={() => { setActionError(""); setPreviewId(null); setConfirmId(null); setAttempt((value) => value + 1); }} className="font-semibold underline underline-offset-4 disabled:opacity-50">به‌روزرسانی فهرست</button></p>}
    {!current ? <p role="status" className="mt-6 text-sm text-slate-600">در حال دریافت پیش‌نویس‌ها…</p> : current.error ? <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{current.error} <button type="button" onClick={() => setAttempt((value) => value + 1)} className="font-semibold underline underline-offset-4">تلاش دوباره</button></p> : current.data && <div className="mt-6">
      <p className="text-sm text-slate-500">{current.data.total.toLocaleString("fa-IR")} پیش‌نویس</p>
      {current.data.transactions.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">پیش‌نویسی با این شرایط پیدا نشد.</p> : <ul className="mt-4 space-y-3">{current.data.transactions.map((item) => <li key={item.id} className="rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-semibold text-slate-900">{item.description}</h3><p className="mt-2 text-sm text-slate-600">{item.type === "INCOME" ? "درآمد" : "هزینه"} · {dateFormat.format(new Date(item.date))} · {item.fiscalYear.name}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">پیش‌نویس</span></div>
        <p className="mt-4 break-words text-lg font-bold text-slate-900">{BigInt(item.amount).toLocaleString("fa-IR")} ریال</p>
        <dl className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2"><div><dt className="text-slate-500">حساب {item.type === "INCOME" ? "درآمد" : "هزینه"}</dt><dd className="mt-1 break-words"><bdi>{item.categoryAccount.code}</bdi> — {item.categoryAccount.name}</dd></div><div><dt className="text-slate-500">حساب تسویه</dt><dd className="mt-1 break-words"><bdi>{item.settlementAccount.code}</bdi> — {item.settlementAccount.name}</dd></div><div><dt className="text-slate-500">روش دریافت یا پرداخت</dt><dd className="mt-1">{methodLabels[item.paymentMethod]}</dd></div></dl>
        {canWrite && item.fiscalYear.status === "OPEN" && <div className="mt-4 border-t border-slate-100 pt-3">
          {confirmId !== item.id && previewId !== item.id && editId !== item.id && <div className="flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={() => { setEditId(item.id); setConfirmId(null); setPreviewId(null); setActionError(""); setSuccess(""); }} className="rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">ویرایش پیش‌نویس</button><button type="button" disabled={pending} onClick={() => { setPreviewId(item.id); setEditId(null); setConfirmId(null); setActionError(""); setSuccess(""); setJournalNumber(null); }} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">پیش‌نمایش و ثبت نهایی</button><button type="button" disabled={pending} onClick={() => { setConfirmId(item.id); setEditId(null); setPreviewId(null); setActionError(""); setSuccess(""); setJournalNumber(null); }} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">حذف پیش‌نویس</button></div>}
          {editId === item.id && years.find((year) => year.id === item.fiscalYearId) && <section aria-label={`ویرایش پیش‌نویس ${item.description}`} className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4"><h4 className="font-semibold text-emerald-950">ویرایش پیش‌نویس</h4><TransactionForm key={item.id} year={years.find((year) => year.id === item.fiscalYearId)!} accounts={accounts} initial={item} onCancel={() => setEditId(null)} onCreated={() => { setEditId(null); setSuccess("تغییرات پیش‌نویس ذخیره شد. فهرست با فیلترهای فعلی به‌روزرسانی می‌شود."); onChanged(); }} /></section>}
          {previewId === item.id && <section aria-label={`پیش‌نمایش سند ${item.description}`} className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4"><h4 className="font-semibold text-emerald-950">پیش‌نمایش سند حسابداری</h4><p className="mt-1 text-xs leading-6 text-slate-600">پس از تأیید، سند نهایی ایجاد می‌شود و این پیش‌نویس از فهرست خارج خواهد شد.</p><dl className="mt-3 space-y-3 text-sm"><div><dt className="font-semibold text-slate-700">بدهکار</dt><dd className="mt-1 break-words">{item.type === "INCOME" ? <><bdi>{item.settlementAccount.code}</bdi> — {item.settlementAccount.name}</> : <><bdi>{item.categoryAccount.code}</bdi> — {item.categoryAccount.name}</>} · {BigInt(item.amount).toLocaleString("fa-IR")} ریال</dd></div><div><dt className="font-semibold text-slate-700">بستانکار</dt><dd className="mt-1 break-words">{item.type === "INCOME" ? <><bdi>{item.categoryAccount.code}</bdi> — {item.categoryAccount.name}</> : <><bdi>{item.settlementAccount.code}</bdi> — {item.settlementAccount.name}</>} · {BigInt(item.amount).toLocaleString("fa-IR")} ریال</dd></div></dl><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={() => void post(item.id)} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{pending ? "در حال ثبت…" : "تأیید و ثبت نهایی"}</button><button type="button" disabled={pending} onClick={() => { setPreviewId(null); setActionError(""); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50">انصراف</button></div></section>}
          {confirmId === item.id && <div className="rounded-lg bg-red-50 p-3"><p className="text-sm leading-6 text-red-900">این پیش‌نویس حذف شود؟</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={() => void remove(item.id)} className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "در حال حذف…" : "تأیید حذف"}</button><button type="button" disabled={pending} onClick={() => setConfirmId(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50">انصراف</button></div></div>}
        </div>}
      </li>)}</ul>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={pending || current.data.page <= 1} onClick={() => { setConfirmId(null); setPreviewId(null); setFilters((value) => ({ ...value, page: value.page - 1 })); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">صفحه قبل</button><span className="text-sm text-slate-600">صفحه {current.data.page.toLocaleString("fa-IR")} از {Math.max(1, Math.ceil(current.data.total / current.data.pageSize)).toLocaleString("fa-IR")}</span><button type="button" disabled={pending || current.data.page * current.data.pageSize >= current.data.total} onClick={() => { setConfirmId(null); setPreviewId(null); setFilters((value) => ({ ...value, page: value.page + 1 })); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">صفحه بعد</button></div>
    </div>}
  </section>;
}
