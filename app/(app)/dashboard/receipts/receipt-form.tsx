"use client";

import { organizationFetch as fetch } from "@/lib/organization-fetch";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persianFa from "react-date-object/locales/persian_fa";
import gregorianEn from "react-date-object/locales/gregorian_en";
import type { Account, Customer, InvoiceResult, OpenInvoice, ReceiptInput, Year } from "./types";

const field = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const normalize = (value: string) => value.trim().replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632)).replace(/^0+(?=\d)/, "");
const persianDate = (value: string) => new DateObject({ date: value, format: "YYYY-MM-DD", calendar: gregorian, locale: gregorianEn }).convert(persian, persianFa);
const formatDate = (value: string) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
const money = (value: string) => BigInt(value).toLocaleString("fa-IR");
type Selection = Record<string, { invoice: OpenInvoice; amount: string }>;

function readStored(value: string | null): ReceiptInput | null {
  if (!value) return null;
  try {
    const payload = JSON.parse(value) as ReceiptInput;
    return payload && typeof payload.requestKey === "string" && typeof payload.amount === "string" && /^[1-9]\d{0,19}$/.test(payload.amount) && Array.isArray(payload.allocations) ? payload : null;
  } catch { return null; }
}

export function ReceiptForm({ storageKey, year, customers, accounts, onChanged }: { storageKey: string; year: Year | null; customers: Customer[]; accounts: Account[]; onChanged: () => void }) {
  const dateId = useId();
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState<DateObject | null>(null);
  const [accountId, setAccountId] = useState("");
  const [method, setMethod] = useState<ReceiptInput["method"]>("CASH");
  const [description, setDescription] = useState("");
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [selection, setSelection] = useState<Selection>({});
  const [invoices, setInvoices] = useState<{ key: string; data?: InvoiceResult; error?: string } | null>(null);
  const [review, setReview] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [recovery, setRecovery] = useState<ReceiptInput | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [storageProblem, setStorageProblem] = useState(false);
  const requestInFlight = useRef(false);
  const customer = customers.find((item) => item.id === customerId);
  const account = accounts.find((item) => item.id === accountId);
  const key = `${customerId}:${page}:${attempt}`;
  const current = invoices?.key === key ? invoices : null;
  const selected = Object.values(selection).filter((item) => item.amount !== "");
  const validAmounts = selected.length > 0 && selected.every((item) => /^[1-9]\d{0,19}$/.test(normalize(item.amount)) && BigInt(normalize(item.amount)) <= BigInt(item.invoice.remaining));
  const total = validAmounts ? selected.reduce((sum, item) => sum + BigInt(normalize(item.amount)), 0n) : 0n;

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try { const raw = sessionStorage.getItem(storageKey); const stored = readStored(raw); setRecovery(stored); setStorageProblem(!!raw && !stored); }
      catch { setStorageProblem(true); }
      setStorageReady(true);
    });
    return () => { cancelled = true; };
  }, [storageKey]);

  useEffect(() => {
    if (!customerId) return;
    const controller = new AbortController();
    async function load() {
      try {
        const query = new URLSearchParams({ partyId: customerId, page: String(page), pageSize: "10" });
        const response = await fetch(`/api/receipts/invoices?${query}`, { cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "دریافت فاکتورها انجام نشد.");
        if (!controller.signal.aborted) setInvoices({ key, data: body });
      } catch (error) { if (!controller.signal.aborted) setInvoices({ key, error: error instanceof Error ? error.message : "ارتباط با سرور برقرار نشد." }); }
    }
    void load(); return () => controller.abort();
  }, [customerId, page, key]);

  function updateAmount(invoice: OpenInvoice, amount: string) {
    setSelection((previous) => { const next = { ...previous }; if (!amount) delete next[invoice.id]; else next[invoice.id] = { invoice, amount }; return next; });
  }

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    if (!year || !date?.isValid) { setError("سال مالی باز و تاریخ دریافت را بررسی کنید."); return; }
    const convertedDate = new DateObject(date).convert(gregorian, gregorianEn).format("YYYY-MM-DD");
    if (convertedDate < year.startDate || convertedDate > year.endDate) { setError("تاریخ باید در محدوده سال مالی باز باشد."); return; }
    if (!customer?.receivable || !customer.receivable.isActive || customer.receivable.hasChildren) { setError("حساب دریافتنی فعال و بدون زیرحساب برای مشتری لازم است."); return; }
    if (!account) { setError("حساب تسویه را انتخاب کنید."); return; }
    if (!validAmounts || total > 99999999999999999999n) { setError("حداقل یک تخصیص مثبت و حداکثر برابر مانده فاکتور وارد کنید؛ جمع باید حداکثر ۲۰ رقم باشد."); return; }
    if (selected.some((item) => item.invoice.date > convertedDate)) { setError("تاریخ دریافت نباید قبل از تاریخ فاکتور باشد."); return; }
    setReview(true);
  }

  async function send(payload: ReceiptInput, previouslyUncertain: boolean) {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setPending(true); setError("");
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch("/api/receipts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: controller.signal });
      const body = await response.json();
      if (!response.ok) {
        if (response.status < 500 && !previouslyUncertain) { sessionStorage.removeItem(storageKey); setRecovery(null); setReview(false); setAttempt((value) => value + 1); setError(body.error || "ثبت دریافت انجام نشد."); }
        else { setRecovery(payload); setError(response.status < 500 ? `${body.error || "ثبت مجدد انجام نشد."} پیش از کنار گذاشتن درخواست، وضعیت آن را در فهرست دریافت‌ها بررسی کنید.` : "نتیجه ثبت نامشخص است. درخواست را با همین اطلاعات دوباره بررسی کنید."); }
        onChanged(); return;
      }
      sessionStorage.removeItem(storageKey); setRecovery(null); setReview(false); setSelection({}); setDate(null); setDescription(""); setCustomerId(""); setAccountId(""); setMethod("CASH"); setPage(1); setAttempt((value) => value + 1);
      setSuccess(`دریافت ثبت شد؛ سند شماره ${Number(body.receipt.journalEntry.number).toLocaleString("fa-IR")} ایجاد شد${body.replay ? " و نتیجه درخواست قبلی بازیابی شد" : ""}.`); onChanged();
    } catch {
      setRecovery(payload); setReview(false); setError("پاسخ سرور دریافت نشد و نتیجه نامشخص است. همین درخواست را دوباره بررسی کنید؛ اطلاعات آن حفظ شده است."); onChanged();
    } finally { window.clearTimeout(timer); requestInFlight.current = false; setPending(false); }
  }

  function confirm() {
    if (requestInFlight.current || !year || !date || !customerId || !accountId || !validAmounts) return;
    let payload: ReceiptInput;
    try {
      payload = { requestKey: crypto.randomUUID(), fiscalYearId: year.id, partyId: customerId, date: new DateObject(date).convert(gregorian, gregorianEn).format("YYYY-MM-DD"), amount: total.toString(), method, settlementAccountId: accountId, description: description.trim() || null, allocations: selected.map((item) => ({ invoiceId: item.invoice.id, amount: normalize(item.amount) })) };
      sessionStorage.setItem(storageKey, JSON.stringify(payload));
    } catch { setError("امکان ایجاد و نگهداری شناسه درخواست در این مرورگر وجود ندارد؛ ثبت انجام نشد. برنامه را در localhost یا اتصال امن باز کنید."); return; }
    void send(payload, false);
  }

  if (!storageReady) return <p role="status" className="mt-4 text-sm text-slate-600">در حال آماده‌سازی فرم…</p>;
  if (storageProblem) return <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm leading-7 text-red-700">اطلاعات درخواست قبلی یا حافظه نشست مرورگر در دسترس نیست. پیش از ادامه، فهرست دریافت‌ها را بررسی کنید و مشکل حافظه مرورگر را رفع کنید.</p>;
  if (recovery) return <div className="mt-5 space-y-4 rounded-xl border border-amber-300 bg-amber-50 p-4"><h3 className="font-semibold text-amber-950">درخواست با نتیجه نامشخص</h3><p className="text-sm leading-7 text-amber-900">درخواست دریافت {money(recovery.amount)} ریال هنوز نیاز به بررسی دارد. تلاش دوباره با همان شناسه انجام می‌شود تا ثبت تکراری ایجاد نشود.</p>{error && <p role="alert" className="text-sm leading-7 text-red-700">{error}</p>}<div className="flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={() => void send(recovery, true)} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "در حال بررسی…" : "بررسی دوباره همین درخواست"}</button><button type="button" disabled={pending} onClick={() => { if (window.confirm("آیا فهرست دریافت‌ها و سندها را بررسی کرده‌اید و می‌خواهید اطلاعات این درخواست را کنار بگذارید؟")) { try { sessionStorage.removeItem(storageKey); setRecovery(null); setError(""); } catch { setStorageProblem(true); } } }} className="rounded-lg border border-amber-400 bg-white px-4 py-2 text-sm text-amber-950">کنار گذاشتن پس از بررسی</button></div><Link href="/dashboard/journal" className="text-sm font-semibold text-emerald-800 underline">مشاهده اسناد حسابداری</Link></div>;
  if (!year) return null;
  return <form onSubmit={prepare} className="mt-5 space-y-4">
    <fieldset disabled={pending || review} className="space-y-4">
      <p className="text-sm text-slate-600">سال مالی باز: <span className="font-semibold text-slate-800">{year.name}</span></p>
      <label className="block text-sm font-medium">مشتری<select value={customerId} required onChange={(event) => { setCustomerId(event.target.value); setPage(1); setSelection({}); setError(""); }} className={field}><option value="">انتخاب مشتری</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      {customer && (!customer.receivable || !customer.receivable.isActive || customer.receivable.hasChildren) && <p className="rounded-lg bg-amber-50 p-3 text-xs leading-6 text-amber-900">حساب دریافتنی فعال برای این مشتری لازم است. آن را در <Link href="/dashboard/parties" className="font-semibold underline">مشتریان</Link> تنظیم و صفحه را دوباره بارگذاری کنید.</p>}
      <div className="text-sm font-medium"><label htmlFor={dateId}>تاریخ دریافت</label><DatePicker id={dateId} value={date} onChange={setDate} minDate={persianDate(year.startDate)} maxDate={persianDate(year.endDate)} calendar={persian} locale={persianFa} format="YYYY/MM/DD" inputClass={field} containerClassName="w-full" editable={false} placeholder="انتخاب تاریخ شمسی" /></div>
      <label className="block text-sm font-medium">حساب تسویه<select value={accountId} required onChange={(event) => setAccountId(event.target.value)} className={field}><option value="">انتخاب حساب صندوق یا بانک</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select><span className="mt-1 block text-xs leading-6 text-slate-500">حساب دارایی مناسب برای دریافت وجه را انتخاب کنید.</span></label>
      {!accounts.length && <p className="text-xs leading-6 text-slate-600">ابتدا حساب فعال و بدون زیرحساب در <Link href="/dashboard/accounts" className="font-semibold text-emerald-700 underline">کدینگ حساب‌ها</Link> تعریف کنید.</p>}
      <label className="block text-sm font-medium">روش دریافت<select value={method} onChange={(event) => setMethod(event.target.value as ReceiptInput["method"])} className={field}><option value="CASH">نقدی</option><option value="BANK_TRANSFER">انتقال بانکی</option><option value="OTHER">سایر</option></select></label>
      <label className="block text-sm font-medium">شرح (اختیاری)<input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} className={field} /></label>
      <div><h3 className="text-sm font-semibold">تخصیص به فاکتورها</h3><p className="mt-1 text-xs leading-6 text-slate-500">مبلغ موردنظر را تا سقف مانده وارد کنید. انتخاب‌های صفحه‌های دیگر حفظ می‌شوند.</p>
        {!customerId ? <p className="mt-3 text-sm text-slate-500">ابتدا مشتری را انتخاب کنید.</p> : !current ? <p role="status" className="mt-3 text-sm text-slate-600">در حال دریافت فاکتورها…</p> : current.error ? <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{current.error} <button type="button" onClick={() => setAttempt((value) => value + 1)} className="font-semibold underline">تلاش دوباره</button></p> : current.data && <>
          {current.data.invoices.length === 0 ? <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">فاکتور صادرشده‌ای برای این مشتری پیدا نشد.</p> : <ul className="mt-3 space-y-3">{current.data.invoices.map((invoice) => <li key={invoice.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"><p className="text-sm font-semibold">فاکتور شماره {invoice.number.toLocaleString("fa-IR")} · {formatDate(invoice.date)}</p><p className="mt-2 text-xs leading-6 text-slate-600">جمع: {money(invoice.total)} · دریافت‌شده: {money(invoice.paid)} · مانده: {money(invoice.remaining)} ریال</p>{BigInt(invoice.remaining) === 0n ? <p className="mt-2 text-xs font-semibold text-emerald-700">تسویه‌شده</p> : <><label className="mt-2 block text-sm font-medium">مبلغ تخصیص (ریال)<input inputMode="numeric" dir="ltr" maxLength={20} value={selection[invoice.id]?.amount ?? ""} onChange={(event) => updateAmount(invoice, event.target.value)} className={field} /></label><button type="button" onClick={() => updateAmount(invoice, invoice.remaining)} className="mt-2 text-xs font-semibold text-emerald-700 underline">تخصیص کل مانده</button></>}</li>)}</ul>}
          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-600"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-40">قبل</button><span>صفحه {page.toLocaleString("fa-IR")} از {Math.max(1, Math.ceil(current.data.total / current.data.pageSize)).toLocaleString("fa-IR")}</span><button type="button" disabled={page * current.data.pageSize >= current.data.total} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-40">بعد</button></div>
        </>}
      </div>
      {selected.length > 0 && <p className="rounded-lg bg-slate-50 p-3 text-sm leading-7 text-slate-700">{selected.length.toLocaleString("fa-IR")} فاکتور انتخاب‌شده · جمع دریافت: {validAmounts && total <= 99999999999999999999n ? `${total.toLocaleString("fa-IR")} ریال` : "مبالغ معتبر نیستند"}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm leading-7 text-red-700">{error}</p>}
      {success && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm leading-7 text-emerald-800">{success}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">پیش‌نمایش دریافت</button>
    </fieldset>
    {review && <section aria-label="پیش‌نمایش دریافت" className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4"><h3 className="font-semibold text-emerald-950">پیش‌نمایش سند دریافت</h3><p className="mt-2 text-xs leading-6 text-slate-600">با تأیید، دریافت و سند حسابداری ثبت می‌شوند.</p><dl className="mt-3 space-y-3 text-sm"><div><dt className="font-semibold">بدهکار · حساب تسویه</dt><dd className="mt-1">{account?.code} — {account?.name} · {total.toLocaleString("fa-IR")} ریال</dd></div><div><dt className="font-semibold">بستانکار · دریافتنی مشتری</dt><dd className="mt-1">{customer?.receivable?.code} — {customer?.receivable?.name} · {total.toLocaleString("fa-IR")} ریال</dd></div></dl><ul className="mt-3 space-y-1 text-xs leading-6 text-slate-700">{selected.map((item) => <li key={item.invoice.id}>فاکتور {item.invoice.number.toLocaleString("fa-IR")} · {money(normalize(item.amount))} ریال</li>)}</ul>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}<div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={confirm} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "در حال ثبت…" : "تأیید و ثبت دریافت"}</button><button type="button" disabled={pending} onClick={() => setReview(false)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50">بازگشت به ویرایش</button></div></section>}
  </form>;
}
