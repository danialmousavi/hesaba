"use client";

import { organizationFetch as fetch } from "@/lib/organization-fetch";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type Account = { id: string; code: string; name: string; isActive: boolean };
type Balances = { asOf: string; receivables: { debitBalance: string; creditBalance: string; linkedAccounts: number; partiesWithoutAccount: number }; payables: { creditBalance: string; debitBalance: string; linkedAccounts: number; partiesWithoutAccount: number }; cash: { selected: boolean; net: string | null; accounts: (Account & { net: string })[] }; systemOpeningRecorded: boolean };
const money = (value: string) => BigInt(value).toLocaleString("fa-IR");
const showDate = (value: string) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
const signed = (value: string) => { const net = BigInt(value); return net === 0n ? "صفر ریال" : `${(net < 0n ? -net : net).toLocaleString("fa-IR")} ریال ${net < 0n ? "بستانکار" : "بدهکار"}`; };

export function BalanceOverview({ yearId, accounts }: { yearId: string; accounts: Account[] }) {
  const [selection, setSelection] = useState<string[]>([]);
  const [applied, setApplied] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: Balances; error?: string } | null>(null);
  const [selectionError, setSelectionError] = useState("");
  const params = new URLSearchParams({ fiscalYearId: yearId });
  for (const id of applied) params.append("cashAccountId", id);
  const query = params.toString(), key = `${query}:${attempt}`;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try { const response = await fetch(`/api/dashboard/balances?${query}`, { cache: "no-store", signal: controller.signal }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "دریافت شاخص‌های مانده انجام نشد."); if (!controller.signal.aborted) setResult({ key, data: body }); }
      catch (error) { if (!controller.signal.aborted) setResult({ key, error: error instanceof Error ? error.message : "ارتباط با سرور برقرار نشد." }); }
    }
    void load(); return () => controller.abort();
  }, [query, key]);
  function apply(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (selection.length > 100) { setSelectionError("حداکثر ۱۰۰ حساب قابل انتخاب است."); return; } setSelectionError(""); setApplied([...selection].sort()); }
  const current = result?.key === key ? result : null;
  return <section aria-labelledby="balance-overview-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="balance-overview-title" className="font-modam text-lg font-bold text-slate-900">مانده حساب‌های اشخاص و نقدی</h2><p className="mt-1 text-xs leading-6 text-slate-500">بر اساس گردش سندهای نهایی سال مالی انتخاب‌شده</p></div><Link href="/dashboard/reports/party-balances" className="text-sm font-semibold text-emerald-700 underline underline-offset-4">گزارش مانده اشخاص</Link></div>
    {!current ? <p role="status" className="mt-5 text-sm text-slate-600">در حال دریافت مانده‌ها…</p> : current.error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm leading-7 text-red-700">{current.error} <button type="button" onClick={() => setAttempt((value) => value + 1)} className="font-semibold underline">تلاش دوباره</button> · <button type="button" onClick={() => { setSelection([]); setApplied([]); setAttempt((value) => value + 1); }} className="font-semibold underline">پاک‌کردن انتخاب حساب‌ها</button></p> : current.data && <>
      <p className="mt-4 text-xs leading-6 text-slate-500">مانده تا پایان سال مالی، {showDate(current.data.asOf)}، پیش از سند اختتامیه دائمی محاسبه شده است. دریافتنی و پرداختنی با مانده فاکتور جمع نمی‌شوند.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="min-w-0 rounded-xl bg-emerald-50 p-4"><h3 className="text-sm font-semibold text-emerald-800">مطالبات حساب‌های اشخاص</h3><p className="mt-2 break-words text-xl font-bold text-emerald-950">{money(current.data.receivables.debitBalance)} <span className="text-xs font-normal">ریال بدهکار</span></p><p className="mt-2 text-xs leading-6 text-emerald-800">مانده بستانکار حساب‌های دریافتنی: {money(current.data.receivables.creditBalance)} ریال</p><p className="text-xs leading-6 text-emerald-800">{current.data.receivables.partiesWithoutAccount.toLocaleString("fa-IR")} مشتری بدون حساب دریافتنی متصل</p></div>
        <div className="min-w-0 rounded-xl bg-amber-50 p-4"><h3 className="text-sm font-semibold text-amber-900">بدهی حساب‌های اشخاص</h3><p className="mt-2 break-words text-xl font-bold text-amber-950">{money(current.data.payables.creditBalance)} <span className="text-xs font-normal">ریال بستانکار</span></p><p className="mt-2 text-xs leading-6 text-amber-900">مانده بدهکار حساب‌های پرداختنی: {money(current.data.payables.debitBalance)} ریال</p><p className="text-xs leading-6 text-amber-900">{current.data.payables.partiesWithoutAccount.toLocaleString("fa-IR")} تأمین‌کننده بدون حساب پرداختنی متصل</p></div>
        <div className="min-w-0 rounded-xl bg-slate-50 p-4"><h3 className="text-sm font-semibold text-slate-700">حساب‌های نقدی انتخاب‌شده</h3><p className="mt-2 break-words text-xl font-bold text-slate-900">{current.data.cash.selected && current.data.cash.net !== null ? signed(current.data.cash.net) : "حسابی انتخاب نشده"}</p><p className="mt-2 text-xs leading-6 text-slate-500">مجموع فقط حساب‌هایی است که خودتان انتخاب می‌کنید.</p></div>
      </div>
      <p className="mt-4 text-xs leading-6 text-slate-500">مانده سال قبل فقط با ثبت سند افتتاحیه وارد این سال می‌شود. {current.data.systemOpeningRecorded ? "افتتاحیه سیستمی ثبت شده است." : "افتتاحیه سیستمی برای این سال ثبت نشده است؛ ممکن است افتتاحیه دستی وجود داشته باشد."}</p>
      {current.data.cash.accounts.length > 0 && <ul className="mt-4 space-y-2" aria-label="مانده حساب‌های نقدی انتخاب‌شده">{current.data.cash.accounts.map((account) => <li key={account.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-50 p-3 text-sm"><span className="break-words"><bdi>{account.code}</bdi> — {account.name}{!account.isActive && " (غیرفعال)"}</span><span className="font-semibold">{signed(account.net)}</span></li>)}</ul>}
    </>}
    <details className="mt-5 rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-semibold text-emerald-800">انتخاب حساب‌های نقدی برای محاسبه</summary><p className="mt-3 text-xs leading-6 text-slate-600">حساب مناسب صندوق یا بانک را خودتان انتخاب کنید؛ هر حساب دارایی لزوماً نقدی نیست. انتخاب فقط برای همین بازدید است و ذخیره نمی‌شود.</p>
      <form onSubmit={apply} className="mt-3"><fieldset><legend className="text-sm font-medium">حساب‌های دارایی بدون زیرحساب و بدون اتصال شخص</legend>{accounts.length === 0 ? <p className="mt-3 text-sm text-slate-500">حساب قابل انتخابی وجود ندارد.</p> : <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">{accounts.map((account) => <label key={account.id} className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm"><input type="checkbox" value={account.id} checked={selection.includes(account.id)} onChange={(event) => { setSelection((value) => event.target.checked ? [...value, account.id] : value.filter((id) => id !== account.id)); setSelectionError(""); }} className="mt-1 accent-emerald-700" /><span className="break-words"><bdi>{account.code}</bdi> — {account.name}{!account.isActive && " (غیرفعال)"}</span></label>)}</div>}</fieldset>{selectionError && <p role="alert" className="mt-3 text-sm text-red-700">{selectionError}</p>}<button className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">اعمال حساب‌های انتخاب‌شده</button></form>
    </details>
  </section>;
}
