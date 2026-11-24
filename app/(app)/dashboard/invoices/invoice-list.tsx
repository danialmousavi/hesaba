"use client";

import { useEffect, useState } from "react";
import type { Invoice, Year } from "./types";

type Result = { invoices: Invoice[]; total: number; page: number; pageSize: number };
const field = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const dateFormat = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "UTC" });
const money = (value: string) => BigInt(value).toLocaleString("fa-IR");

export function InvoiceList({ years, canWrite, revision, onChanged, onEdit, editingId, saving }: { years: Year[]; canWrite: boolean; revision: number; onChanged: () => void; onEdit: (invoice: Invoice) => void; editingId?: string; saving: boolean }) {
  const [year, setYear] = useState("");
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: Result; error?: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const params = new URLSearchParams({ page: String(page) });
  if (year) params.set("fiscalYearId", year);
  const query = params.toString();
  const key = `${query}:${revision}:${attempt}`;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/invoices?${query}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "دریافت فاکتورها انجام نشد.");
        if (!controller.signal.aborted) setResult({ key, data });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ key, error: error instanceof Error ? error.message : "ارتباط با سرور برقرار نشد." });
      }
    }
    void load();
    return () => controller.abort();
  }, [query, key]);

  async function remove(id: string) {
    setPending(true); setMessage(""); setActionError("");
    try {
      const response = await fetch(`/api/invoices/${encodeURIComponent(id)}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) { setActionError(body.error || "حذف پیش‌نویس انجام نشد."); return; }
      setConfirmId(null); setMessage("پیش‌نویس حذف شد.");
      if (result?.key === key && result.data?.invoices.length === 1 && page > 1) setPage((value) => value - 1);
      onChanged();
    } catch { setActionError("پاسخ سرور دریافت نشد؛ فهرست را به‌روز کنید."); onChanged(); }
    finally { setPending(false); }
  }

  const current = result?.key === key ? result : null;
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <h2 className="font-modam text-xl font-bold">پیش‌نویس‌ها</h2>
    <p className="mt-2 text-xs leading-6 text-slate-500">جمع هر فاکتور از سرور دریافت می‌شود.</p>
    <label className="mt-4 block max-w-xs text-sm font-medium">سال مالی<select value={year} onChange={(event) => { setYear(event.target.value); setPage(1); setConfirmId(null); }} className={field}><option value="">همه سال‌ها</option>{years.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.status === "OPEN" ? "باز" : "بسته"}</option>)}</select></label>
    {message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {actionError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionError} <button type="button" onClick={() => setAttempt((value) => value + 1)} className="font-semibold underline">به‌روزرسانی فهرست</button></p>}
    {!current ? <p role="status" className="mt-6 text-sm text-slate-600">در حال دریافت پیش‌نویس‌ها…</p> : current.error ? <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{current.error} <button type="button" onClick={() => setAttempt((value) => value + 1)} className="font-semibold underline">تلاش دوباره</button></p> : current.data && <div className="mt-6">
      <p className="text-sm text-slate-500">{current.data.total.toLocaleString("fa-IR")} پیش‌نویس</p>
      {current.data.invoices.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">پیش‌نویس فاکتوری پیدا نشد.</p> : <ul className="mt-4 space-y-3">{current.data.invoices.map((invoice) => <li key={invoice.id} className="rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{invoice.customerName}</h3><p className="mt-2 text-sm text-slate-600">{dateFormat.format(new Date(`${invoice.date}T00:00:00Z`))} · {years.find((item) => item.id === invoice.fiscalYearId)?.name ?? "سال مالی"}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">پیش‌نویس</span></div>
        <p className="mt-4 text-lg font-bold text-slate-900">{money(invoice.totals.total)} ریال</p>
        {invoice.description && <p className="mt-2 break-words text-sm text-slate-600">{invoice.description}</p>}
        <details className="mt-4 rounded-lg bg-slate-50 p-3 text-sm"><summary className="cursor-pointer font-semibold text-emerald-800">مشاهده اقلام و مبالغ</summary><ul className="mt-3 space-y-3">{invoice.lines.map((line) => <li key={line.id} className="border-b border-slate-200 pb-3 last:border-0 last:pb-0"><p className="font-medium"><bdi>{line.productCode}</bdi> — {line.productName}</p><p className="mt-1 leading-7 text-slate-600">تعداد: <bdi>{line.quantity}</bdi> {line.unit} · قیمت واحد: {money(line.unitPrice)} ریال</p><p className="leading-7 text-slate-600">تخفیف: {money(line.discountAmount)} · مالیات: {money(line.taxAmount)} · جمع: {money(line.amounts.total)} ریال</p></li>)}</ul><p className="mt-3 border-t border-slate-200 pt-3 leading-7 text-slate-700">جمع کالاها: {money(invoice.totals.subtotal)} · تخفیف: {money(invoice.totals.discountAmount)} · مالیات: {money(invoice.totals.taxAmount)} ریال</p></details>
        {canWrite && years.some((item) => item.id === invoice.fiscalYearId && item.status === "OPEN") && <div className="mt-4 border-t border-slate-100 pt-3">{confirmId !== invoice.id ? <div className="flex flex-wrap gap-2"><button type="button" disabled={pending || saving} onClick={() => { setActionError(""); setMessage(""); onEdit(invoice); }} className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">{editingId === invoice.id ? "بارگذاری دوباره برای ویرایش" : "ویرایش پیش‌نویس"}</button><button type="button" disabled={pending || saving || editingId === invoice.id} onClick={() => { setConfirmId(invoice.id); setActionError(""); setMessage(""); }} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">حذف پیش‌نویس</button></div> : <div className="rounded-lg bg-red-50 p-3"><p className="text-sm text-red-900">این پیش‌نویس و اقلام آن حذف شوند؟</p><div className="mt-2 flex gap-2"><button type="button" disabled={pending || saving} onClick={() => void remove(invoice.id)} className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "در حال حذف…" : "تأیید حذف"}</button><button type="button" disabled={pending || saving} onClick={() => setConfirmId(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">انصراف</button></div></div>}</div>}
      </li>)}</ul>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={pending || page <= 1} onClick={() => { setPage((value) => value - 1); setConfirmId(null); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">صفحه قبل</button><span className="text-sm text-slate-600">صفحه {page.toLocaleString("fa-IR")} از {Math.max(1, Math.ceil(current.data.total / current.data.pageSize)).toLocaleString("fa-IR")}</span><button type="button" disabled={pending || page * current.data.pageSize >= current.data.total} onClick={() => { setPage((value) => value + 1); setConfirmId(null); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">صفحه بعد</button></div>
    </div>}
  </section>;
}
