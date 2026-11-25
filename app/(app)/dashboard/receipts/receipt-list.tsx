"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Receipt } from "./types";

type Result = { receipts: Receipt[]; total: number; page: number; pageSize: number };
const dateFormat = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "UTC" });
const money = (value: string) => BigInt(value).toLocaleString("fa-IR");
const methodLabels = { CASH: "نقدی", BANK_TRANSFER: "انتقال بانکی", OTHER: "سایر" } as const;

export function ReceiptList({ revision }: { revision: number }) {
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: Result; error?: string } | null>(null);
  const key = `${page}:${revision}:${attempt}`;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/receipts?page=${page}`, { cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "دریافت فهرست انجام نشد.");
        if (!controller.signal.aborted) setResult({ key, data: body });
      } catch (error) { if (!controller.signal.aborted) setResult({ key, error: error instanceof Error ? error.message : "ارتباط با سرور برقرار نشد." }); }
    }
    void load(); return () => controller.abort();
  }, [page, key]);
  const current = result?.key === key ? result : null;
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="font-modam text-xl font-bold">دریافت‌های ثبت‌شده</h2>
    {!current ? <p role="status" className="mt-5 text-sm text-slate-600">در حال دریافت فهرست…</p> : current.error ? <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{current.error} <button type="button" onClick={() => setAttempt((value) => value + 1)} className="font-semibold underline">تلاش دوباره</button></p> : current.data && <div className="mt-5"><p className="text-sm text-slate-500">{current.data.total.toLocaleString("fa-IR")} دریافت</p>
      {current.data.receipts.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">هنوز دریافتی ثبت نشده است.</p> : <ul className="mt-4 space-y-3">{current.data.receipts.map((item) => <li key={item.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{item.party.name}</h3><p className="mt-2 text-sm text-slate-600">{dateFormat.format(new Date(`${item.date}T00:00:00Z`))} · {methodLabels[item.method]}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">ثبت‌شده</span></div>
        <p className="mt-4 text-lg font-bold">{money(item.amount)} ریال</p><p className="mt-2 text-sm leading-7 text-slate-600">حساب تسویه: <bdi>{item.settlementAccount.code}</bdi> — {item.settlementAccount.name}</p>{item.description && <p className="mt-1 break-words text-sm text-slate-600">{item.description}</p>}
        <details className="mt-3 rounded-lg bg-slate-50 p-3 text-sm"><summary className="cursor-pointer font-semibold text-emerald-800">فاکتورهای تخصیص‌یافته</summary><ul className="mt-2 space-y-2">{item.allocations.map((allocation) => <li key={allocation.invoiceId}>فاکتور شماره {allocation.invoice.number.toLocaleString("fa-IR")} · {money(allocation.amount)} ریال</li>)}</ul></details>
        {item.journalEntry && <p className="mt-3 text-sm text-emerald-800"><Link href={`/dashboard/journal#journal-${item.journalEntryId}`} className="font-semibold underline">سند شماره {item.journalEntry.number.toLocaleString("fa-IR")}</Link></p>}
      </li>)}</ul>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">صفحه قبل</button><span className="text-sm text-slate-600">صفحه {page.toLocaleString("fa-IR")} از {Math.max(1, Math.ceil(current.data.total / current.data.pageSize)).toLocaleString("fa-IR")}</span><button type="button" disabled={page * current.data.pageSize >= current.data.total} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">صفحه بعد</button></div>
    </div>}
  </section>;
}
