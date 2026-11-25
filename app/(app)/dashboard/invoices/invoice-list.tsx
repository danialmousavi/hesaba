"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IssuePreview } from "./issue-preview";
import type { Customer, Invoice, IssueAccount, Year } from "./types";

type Result = { invoices: Invoice[]; total: number; page: number; pageSize: number };
const field = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const dateFormat = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "UTC" });
const money = (value: string) => BigInt(value).toLocaleString("fa-IR");

export function InvoiceList({ years, customers, accounts, canWrite, revision, onChanged, onEdit, editingId, saving }: { years: Year[]; customers: Customer[]; accounts: IssueAccount[]; canWrite: boolean; revision: number; onChanged: () => void; onEdit: (invoice: Invoice) => void; editingId?: string; saving: boolean }) {
  const [year, setYear] = useState("");
  const [status, setStatus] = useState<"draft" | "issued">("draft");
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: Result; error?: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [issueId, setIssueId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const params = new URLSearchParams({ page: String(page), status });
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

  async function issue(invoice: Invoice, revenueAccountId: string, taxAccountId: string | null) {
    setPending(true); setMessage(""); setActionError("");
    try {
      const response = await fetch(`/api/invoices/${encodeURIComponent(invoice.id)}/issue`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ revision: invoice.revision, revenueAccountId, taxAccountId }) });
      const body = await response.json();
      if (!response.ok) {
        setActionError(response.status >= 500 ? "نتیجه صدور نامشخص است؛ پیش از تلاش دوباره فاکتورهای صادرشده و اسناد حسابداری را بررسی کنید." : body.error || "صدور فاکتور انجام نشد.");
        if (response.status === 409 || response.status >= 500) { setIssueId(null); onChanged(); }
        return;
      }
      setIssueId(null); setPage(1); setStatus("issued");
      setMessage(`فاکتور شماره ${Number(body.invoice.number).toLocaleString("fa-IR")} صادر شد و سند شماره ${Number(body.journal.number).toLocaleString("fa-IR")} ثبت شد.`);
      onChanged();
    } catch {
      setIssueId(null); setActionError("پاسخ سرور دریافت نشد؛ پیش از تلاش دوباره فاکتورهای صادرشده و اسناد حسابداری را بررسی کنید."); onChanged();
    } finally { setPending(false); }
  }

  const current = result?.key === key ? result : null;
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <h2 className="font-modam text-xl font-bold">فهرست فاکتورها</h2>
    <p className="mt-2 text-xs leading-6 text-slate-500">جمع هر فاکتور از سرور دریافت می‌شود.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">وضعیت<select disabled={pending} value={status} onChange={(event) => { setStatus(event.target.value as "draft" | "issued"); setPage(1); setConfirmId(null); setIssueId(null); }} className={field}><option value="draft">پیش‌نویس</option><option value="issued">صادرشده</option></select></label><label className="block text-sm font-medium">سال مالی<select disabled={pending} value={year} onChange={(event) => { setYear(event.target.value); setPage(1); setConfirmId(null); setIssueId(null); }} className={field}><option value="">همه سال‌ها</option>{years.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.status === "OPEN" ? "باز" : "بسته"}</option>)}</select></label></div>
    {message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {actionError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm leading-7 text-red-700">{actionError} <button type="button" onClick={() => setAttempt((value) => value + 1)} className="font-semibold underline">به‌روزرسانی فهرست</button> · <button type="button" onClick={() => { setStatus("issued"); setPage(1); setIssueId(null); }} className="font-semibold underline">فاکتورهای صادرشده</button> · <Link href="/dashboard/journal" className="font-semibold underline">اسناد حسابداری</Link></p>}
    {!current ? <p role="status" className="mt-6 text-sm text-slate-600">در حال دریافت پیش‌نویس‌ها…</p> : current.error ? <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{current.error} <button type="button" onClick={() => setAttempt((value) => value + 1)} className="font-semibold underline">تلاش دوباره</button></p> : current.data && <div className="mt-6">
      <p className="text-sm text-slate-500">{current.data.total.toLocaleString("fa-IR")} فاکتور</p>
      {current.data.invoices.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">فاکتوری با این وضعیت پیدا نشد.</p> : <ul className="mt-4 space-y-3">{current.data.invoices.map((invoice) => <li key={invoice.id} className="rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{invoice.customerName}{invoice.number !== null && <> · فاکتور شماره {invoice.number.toLocaleString("fa-IR")}</>}</h3><p className="mt-2 text-sm text-slate-600">{dateFormat.format(new Date(`${invoice.date}T00:00:00Z`))} · {years.find((item) => item.id === invoice.fiscalYearId)?.name ?? "سال مالی"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${invoice.status === "ISSUED" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{invoice.status === "ISSUED" ? "صادرشده" : "پیش‌نویس"}</span></div>
        <p className="mt-4 text-lg font-bold text-slate-900">{money(invoice.totals.total)} ریال</p>
        {invoice.description && <p className="mt-2 break-words text-sm text-slate-600">{invoice.description}</p>}
        {invoice.status === "ISSUED" && invoice.journalEntryId && <p className="mt-2 text-sm text-emerald-800">سند حسابداری ثبت شده است. <Link href={`/dashboard/journal#journal-${invoice.journalEntryId}`} className="font-semibold underline">مشاهده سند مرتبط</Link></p>}
        <details className="mt-4 rounded-lg bg-slate-50 p-3 text-sm"><summary className="cursor-pointer font-semibold text-emerald-800">مشاهده اقلام و مبالغ</summary><ul className="mt-3 space-y-3">{invoice.lines.map((line) => <li key={line.id} className="border-b border-slate-200 pb-3 last:border-0 last:pb-0"><p className="font-medium"><bdi>{line.productCode}</bdi> — {line.productName}</p><p className="mt-1 leading-7 text-slate-600">تعداد: <bdi>{line.quantity}</bdi> {line.unit} · قیمت واحد: {money(line.unitPrice)} ریال</p><p className="leading-7 text-slate-600">تخفیف: {money(line.discountAmount)} · مالیات: {money(line.taxAmount)} · جمع: {money(line.amounts.total)} ریال</p></li>)}</ul><p className="mt-3 border-t border-slate-200 pt-3 leading-7 text-slate-700">جمع کالاها: {money(invoice.totals.subtotal)} · تخفیف: {money(invoice.totals.discountAmount)} · مالیات: {money(invoice.totals.taxAmount)} ریال</p></details>
        {invoice.status === "DRAFT" && canWrite && years.some((item) => item.id === invoice.fiscalYearId && item.status === "OPEN") && <div className="mt-4 border-t border-slate-100 pt-3">
          {issueId === invoice.id ? <IssuePreview key={`${invoice.id}:${invoice.revision}`} invoice={invoice} customer={customers.find((customer) => customer.id === invoice.customerId)} accounts={accounts} pending={pending} onIssue={(revenueId, taxId) => void issue(invoice, revenueId, taxId)} onCancel={() => setIssueId(null)} /> : confirmId === invoice.id ? <div className="rounded-lg bg-red-50 p-3"><p className="text-sm text-red-900">این پیش‌نویس و اقلام آن حذف شوند؟</p><div className="mt-2 flex gap-2"><button type="button" disabled={pending || saving} onClick={() => void remove(invoice.id)} className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "در حال حذف…" : "تأیید حذف"}</button><button type="button" disabled={pending || saving} onClick={() => setConfirmId(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">انصراف</button></div></div> : <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending || saving || editingId === invoice.id} onClick={() => { setIssueId(invoice.id); setActionError(""); setMessage(""); }} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">پیش‌نمایش و صدور</button>
            <button type="button" disabled={pending || saving} onClick={() => { setIssueId(null); setActionError(""); setMessage(""); onEdit(invoice); }} className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">{editingId === invoice.id ? "بارگذاری دوباره برای ویرایش" : "ویرایش پیش‌نویس"}</button>
            <button type="button" disabled={pending || saving || editingId === invoice.id} onClick={() => { setIssueId(null); setConfirmId(invoice.id); setActionError(""); setMessage(""); }} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">حذف پیش‌نویس</button>
          </div>}
        </div>}
      </li>)}</ul>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={pending || page <= 1} onClick={() => { setPage((value) => value - 1); setConfirmId(null); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">صفحه قبل</button><span className="text-sm text-slate-600">صفحه {page.toLocaleString("fa-IR")} از {Math.max(1, Math.ceil(current.data.total / current.data.pageSize)).toLocaleString("fa-IR")}</span><button type="button" disabled={pending || page * current.data.pageSize >= current.data.total} onClick={() => { setPage((value) => value + 1); setConfirmId(null); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">صفحه بعد</button></div>
    </div>}
  </section>;
}
