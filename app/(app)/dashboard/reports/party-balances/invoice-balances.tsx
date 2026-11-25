"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { InvoiceResult } from "./types";

const money = (value: string) => BigInt(value).toLocaleString("fa-IR");
const dateFormat = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "UTC" });

export function InvoiceBalances({ partyId, fiscalYearId }: { partyId: string; fiscalYearId: string }) {
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: InvoiceResult; error?: string } | null>(null);
  const key = `${partyId}:${fiscalYearId}:${page}:${attempt}`;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const query = new URLSearchParams({ fiscalYearId, partyId, page: String(page), pageSize: "10" });
        const response = await fetch(`/api/reports/party-balances/invoices?${query}`, { cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "دریافت فاکتورها انجام نشد.");
        if (!controller.signal.aborted) setResult({ key, data: body });
      } catch (error) { if (!controller.signal.aborted) setResult({ key, error: error instanceof Error ? error.message : "ارتباط با سرور برقرار نشد." }); }
    }
    void load(); return () => controller.abort();
  }, [partyId, fiscalYearId, page, key]);
  const current = result?.key === key ? result : null;
  return <section aria-label="مانده فاکتورهای شخص" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
    <h4 className="font-semibold text-emerald-950">فاکتورهای صادرشده در سال انتخاب‌شده</h4>
    {!current ? <p role="status" className="mt-3 text-sm text-slate-600">در حال دریافت فاکتورها…</p> : current.error ? <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{current.error} <button type="button" onClick={() => setAttempt((value) => value + 1)} className="font-semibold underline">تلاش دوباره</button></p> : current.data && <>
      <p className="mt-2 text-xs leading-6 text-slate-600">دریافت‌ها تا پایان {dateFormat.format(new Date(`${current.data.fiscalYear.endDate}T00:00:00Z`))} لحاظ شده‌اند؛ دریافت‌های بعدی در این مانده تاریخی نیستند.</p>
      {current.data.rows.length === 0 ? <p className="mt-3 rounded-lg bg-white p-3 text-sm text-slate-600">فاکتور صادرشده‌ای برای این شخص در سال انتخاب‌شده وجود ندارد.</p> : <ul className="mt-3 space-y-3">{current.data.rows.map((invoice) => <li key={invoice.id} className="rounded-lg border border-emerald-100 bg-white p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold">فاکتور شماره {invoice.number.toLocaleString("fa-IR")}</p><p className="text-slate-600">{dateFormat.format(new Date(`${invoice.date}T00:00:00Z`))}</p></div><dl className="mt-3 grid gap-3 text-slate-700 sm:grid-cols-3"><div><dt className="text-xs text-slate-500">مبلغ فاکتور</dt><dd className="mt-1 break-words font-semibold">{money(invoice.amount)} ریال</dd></div><div><dt className="text-xs text-slate-500">دریافت‌شده تا پایان سال</dt><dd className="mt-1 break-words">{money(invoice.paid)} ریال</dd></div><div><dt className="text-xs text-slate-500">مانده تا پایان سال</dt><dd className="mt-1 break-words font-semibold">{money(invoice.remaining)} ریال</dd></div></dl>{invoice.journalEntryId && <Link href={`/dashboard/journal#journal-${invoice.journalEntryId}`} className="mt-3 inline-block text-xs font-semibold text-emerald-800 underline">سند مرتبط</Link>}</li>)}</ul>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:opacity-40">صفحه قبل</button><span>صفحه {page.toLocaleString("fa-IR")} از {Math.max(1, Math.ceil(current.data.total / current.data.pageSize)).toLocaleString("fa-IR")}</span><button type="button" disabled={page * current.data.pageSize >= current.data.total} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:opacity-40">صفحه بعد</button></div>
    </>}
  </section>;
}
