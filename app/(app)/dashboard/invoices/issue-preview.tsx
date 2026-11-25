"use client";

import Link from "next/link";
import { useState } from "react";
import type { Customer, Invoice, IssueAccount } from "./types";

const field = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const money = (value: string) => BigInt(value).toLocaleString("fa-IR");

export function IssuePreview({ invoice, customer, accounts, pending, onIssue, onCancel }: { invoice: Invoice; customer?: Customer; accounts: IssueAccount[]; pending: boolean; onIssue: (revenueAccountId: string, taxAccountId: string | null) => void; onCancel: () => void }) {
  const [revenueId, setRevenueId] = useState("");
  const [taxId, setTaxId] = useState("");
  const receivable = customer?.receivable;
  const canUseReceivable = !!receivable?.isActive && !receivable.hasChildren;
  const revenueAccounts = accounts.filter((account) => account.type === "REVENUE");
  const taxAccounts = accounts.filter((account) => account.type === "LIABILITY");
  const selectedRevenue = revenueAccounts.find((account) => account.id === revenueId);
  const selectedTax = taxAccounts.find((account) => account.id === taxId);
  const taxRequired = BigInt(invoice.totals.taxAmount) > 0n;
  const isPositive = BigInt(invoice.totals.total) > 0n;
  return <section aria-label={`پیش‌نمایش صدور فاکتور ${invoice.customerName}`} className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
    <h4 className="font-semibold text-emerald-950">پیش‌نمایش سند فروش نسیه</h4>
    <p className="mt-2 text-xs leading-6 text-slate-600">با تأیید، فاکتور صادر و سند حسابداری ثبت می‌شود. مبلغ فاکتور به حساب دریافتنی مشتری منظور می‌شود و به معنی دریافت وجه نیست.</p>
    {!canUseReceivable && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm leading-7 text-amber-900">حساب دریافتنی فعال و بدون زیرحساب برای این مشتری یافت نشد. ابتدا اتصال حساب را در <Link href="/dashboard/parties" className="font-semibold underline">صفحه مشتریان</Link> بررسی کنید و سپس صفحه را دوباره بارگذاری کنید.</p>}
    {!isPositive && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">مبلغ نهایی صفر قابل صدور نیست.</p>}
    <label className="mt-3 block text-sm font-medium">حساب درآمد<select value={revenueId} disabled={pending} onChange={(event) => setRevenueId(event.target.value)} className={field}><option value="">انتخاب حساب درآمد</option>{revenueAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}</select></label>
    {taxRequired && <label className="mt-3 block text-sm font-medium">حساب بدهی مالیات<select value={taxId} disabled={pending} onChange={(event) => setTaxId(event.target.value)} className={field}><option value="">انتخاب حساب بدهی مالیات</option>{taxAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}</select></label>}
    {(!revenueAccounts.length || (taxRequired && !taxAccounts.length)) && <p className="mt-3 text-xs leading-6 text-slate-600">حساب مناسب پیدا نشد؛ آن را در <Link href="/dashboard/accounts" className="font-semibold text-emerald-800 underline">کدینگ حساب‌ها</Link> ایجاد یا فعال کنید و صفحه را دوباره بارگذاری کنید.</p>}
    <p className="mt-3 text-xs leading-6 text-slate-600">نوع حساب به‌تنهایی کاربرد آن را تضمین نمی‌کند؛ حساب درآمد و بدهی مالیات مناسب را انتخاب کنید.</p>
    <dl className="mt-4 space-y-3 text-sm"><div><dt className="font-semibold text-slate-700">بدهکار · دریافتنی مشتری</dt><dd className="mt-1 break-words">{receivable ? <><bdi>{receivable.code}</bdi> — {receivable.name}</> : "حساب انتخاب نشده"} · {money(invoice.totals.total)} ریال</dd></div>{BigInt(invoice.totals.taxableAmount) > 0n && <div><dt className="font-semibold text-slate-700">بستانکار · درآمد پس از تخفیف</dt><dd className="mt-1 break-words">{selectedRevenue ? <><bdi>{selectedRevenue.code}</bdi> — {selectedRevenue.name}</> : "حساب انتخاب نشده"} · {money(invoice.totals.taxableAmount)} ریال</dd></div>}{taxRequired && <div><dt className="font-semibold text-slate-700">بستانکار · بدهی مالیات</dt><dd className="mt-1 break-words">{selectedTax ? <><bdi>{selectedTax.code}</bdi> — {selectedTax.name}</> : "حساب انتخاب نشده"} · {money(invoice.totals.taxAmount)} ریال</dd></div>}</dl>
    <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={pending || !canUseReceivable || !isPositive || !revenueId || (taxRequired && !taxId)} onClick={() => onIssue(revenueId, taxRequired ? taxId : null)} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{pending ? "در حال صدور…" : "تأیید و صدور فاکتور"}</button><button type="button" disabled={pending} onClick={onCancel} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50">انصراف</button></div>
  </section>;
}
