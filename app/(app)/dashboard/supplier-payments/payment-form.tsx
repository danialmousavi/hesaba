"use client";

import { organizationFetch as fetch } from "@/lib/organization-fetch";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persianFa from "react-date-object/locales/persian_fa";
import gregorianEn from "react-date-object/locales/gregorian_en";
import type { Account, PaymentInput, Supplier, Year } from "./types";

const field = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const normalize = (value: string) => value.trim().replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632)).replace(/^0+(?=\d)/, "");
const persianDate = (value: string) => new DateObject({ date: value, format: "YYYY-MM-DD", calendar: gregorian, locale: gregorianEn }).convert(persian, persianFa);
const money = (value: string) => BigInt(value).toLocaleString("fa-IR");

function readStored(value: string | null): PaymentInput | null {
  if (!value) return null;
  try {
    const payload = JSON.parse(value) as PaymentInput;
    return payload && typeof payload.requestKey === "string" && typeof payload.amount === "string" && /^[1-9]\d{0,19}$/.test(payload.amount) && typeof payload.partyId === "string" && typeof payload.fiscalYearId === "string" && typeof payload.date === "string" && typeof payload.settlementAccountId === "string" && ["CASH", "BANK_TRANSFER", "OTHER"].includes(payload.method) ? payload : null;
  } catch { return null; }
}

export function PaymentForm({ storageKey, year, suppliers, accounts, onChanged }: { storageKey: string; year: Year | null; suppliers: Supplier[]; accounts: Account[]; onChanged: () => void }) {
  const dateId = useId();
  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState<DateObject | null>(null);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentInput["method"]>("CASH");
  const [description, setDescription] = useState("");
  const [review, setReview] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [recovery, setRecovery] = useState<PaymentInput | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [storageProblem, setStorageProblem] = useState(false);
  const requestInFlight = useRef(false);
  const supplier = suppliers.find((item) => item.id === supplierId);
  const account = accounts.find((item) => item.id === accountId);
  const normalizedAmount = normalize(amount);

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

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    if (!year || !date?.isValid) { setError("سال مالی باز و تاریخ پرداخت را بررسی کنید."); return; }
    const convertedDate = new DateObject(date).convert(gregorian, gregorianEn).format("YYYY-MM-DD");
    if (convertedDate < year.startDate || convertedDate > year.endDate) { setError("تاریخ باید در محدوده سال مالی باز باشد."); return; }
    if (!supplier?.payable || !supplier.payable.isActive || supplier.payable.hasChildren) { setError("حساب پرداختنی فعال و بدون زیرحساب برای تأمین‌کننده لازم است."); return; }
    if (!account) { setError("حساب تسویه را انتخاب کنید."); return; }
    if (!/^[1-9]\d{0,19}$/.test(normalizedAmount)) { setError("مبلغ باید عدد صحیح مثبت و حداکثر ۲۰ رقم به ریال باشد."); return; }
    setReview(true);
  }

  async function send(payload: PaymentInput, previouslyUncertain: boolean) {
    if (requestInFlight.current) return;
    requestInFlight.current = true; setPending(true); setError("");
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch("/api/supplier-payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: controller.signal });
      const body = await response.json();
      if (!response.ok) {
        if (response.status < 500 && !previouslyUncertain) { sessionStorage.removeItem(storageKey); setRecovery(null); setReview(false); setError(body.error || "ثبت پرداخت انجام نشد."); }
        else { setRecovery(payload); setError(response.status < 500 ? `${body.error || "ثبت مجدد انجام نشد."} پیش از کنار گذاشتن درخواست، وضعیت آن را در فهرست پرداخت‌ها بررسی کنید.` : "نتیجه ثبت نامشخص است. درخواست را با همین اطلاعات دوباره بررسی کنید."); }
        onChanged(); return;
      }
      sessionStorage.removeItem(storageKey); setRecovery(null); setReview(false); setDate(null); setDescription(""); setSupplierId(""); setAccountId(""); setAmount(""); setMethod("CASH");
      setSuccess(`پرداخت ثبت شد؛ سند شماره ${Number(body.payment.journalEntry.number).toLocaleString("fa-IR")} ایجاد شد${body.replay ? " و نتیجه درخواست قبلی بازیابی شد" : ""}.`); onChanged();
    } catch { setRecovery(payload); setReview(false); setError("پاسخ سرور دریافت نشد و نتیجه نامشخص است. همین درخواست را دوباره بررسی کنید؛ اطلاعات آن حفظ شده است."); onChanged(); }
    finally { window.clearTimeout(timer); requestInFlight.current = false; setPending(false); }
  }

  function confirm() {
    if (requestInFlight.current || !year || !date || !supplierId || !accountId || !/^[1-9]\d{0,19}$/.test(normalizedAmount)) return;
    let payload: PaymentInput;
    try {
      payload = { requestKey: crypto.randomUUID(), fiscalYearId: year.id, partyId: supplierId, date: new DateObject(date).convert(gregorian, gregorianEn).format("YYYY-MM-DD"), amount: normalizedAmount, method, settlementAccountId: accountId, description: description.trim() || null };
      sessionStorage.setItem(storageKey, JSON.stringify(payload));
    } catch { setError("امکان ایجاد و نگهداری شناسه درخواست در این مرورگر وجود ندارد؛ ثبت انجام نشد. برنامه را در localhost یا اتصال امن باز کنید."); return; }
    void send(payload, false);
  }

  if (!storageReady) return <p role="status" className="mt-4 text-sm text-slate-600">در حال آماده‌سازی فرم…</p>;
  if (storageProblem) return <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm leading-7 text-red-700">اطلاعات درخواست قبلی یا حافظه نشست مرورگر در دسترس نیست. پیش از ادامه، فهرست پرداخت‌ها را بررسی کنید و مشکل حافظه مرورگر را رفع کنید.</p>;
  if (recovery) return <div className="mt-5 space-y-4 rounded-xl border border-amber-300 bg-amber-50 p-4"><h3 className="font-semibold text-amber-950">درخواست با نتیجه نامشخص</h3><p className="text-sm leading-7 text-amber-900">درخواست پرداخت {money(recovery.amount)} ریال هنوز نیاز به بررسی دارد. تلاش دوباره با همان شناسه انجام می‌شود تا ثبت تکراری ایجاد نشود.</p>{error && <p role="alert" className="text-sm leading-7 text-red-700">{error}</p>}<div className="flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={() => void send(recovery, true)} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "در حال بررسی…" : "بررسی دوباره همین درخواست"}</button><button type="button" disabled={pending} onClick={() => { if (window.confirm("آیا فهرست پرداخت‌ها و سندها را بررسی کرده‌اید و می‌خواهید اطلاعات این درخواست را کنار بگذارید؟")) { try { sessionStorage.removeItem(storageKey); setRecovery(null); setError(""); } catch { setStorageProblem(true); } } }} className="rounded-lg border border-amber-400 bg-white px-4 py-2 text-sm text-amber-950">کنار گذاشتن پس از بررسی</button></div><Link href="/dashboard/journal" className="text-sm font-semibold text-emerald-800 underline">مشاهده اسناد حسابداری</Link></div>;
  if (!year) return null;
  return <form onSubmit={prepare} className="mt-5 space-y-4"><fieldset disabled={pending || review} className="space-y-4">
    <p className="text-sm text-slate-600">سال مالی باز: <span className="font-semibold text-slate-800">{year.name}</span></p>
    <label className="block text-sm font-medium">تأمین‌کننده<select value={supplierId} required onChange={(event) => { setSupplierId(event.target.value); setError(""); }} className={field}><option value="">انتخاب تأمین‌کننده</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    {supplier && (!supplier.payable || !supplier.payable.isActive || supplier.payable.hasChildren) && <p className="rounded-lg bg-amber-50 p-3 text-xs leading-6 text-amber-900">حساب پرداختنی فعال برای این تأمین‌کننده لازم است. آن را در <Link href="/dashboard/parties" className="font-semibold underline">تأمین‌کنندگان</Link> تنظیم و صفحه را دوباره بارگذاری کنید.</p>}
    <div className="text-sm font-medium"><label htmlFor={dateId}>تاریخ پرداخت</label><DatePicker id={dateId} value={date} onChange={setDate} minDate={persianDate(year.startDate)} maxDate={persianDate(year.endDate)} calendar={persian} locale={persianFa} format="YYYY/MM/DD" inputClass={field} containerClassName="w-full" editable={false} placeholder="انتخاب تاریخ شمسی" /></div>
    <label className="block text-sm font-medium">حساب تسویه<select value={accountId} required onChange={(event) => setAccountId(event.target.value)} className={field}><option value="">انتخاب حساب صندوق یا بانک</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select><span className="mt-1 block text-xs leading-6 text-slate-500">حساب دارایی مناسب برای پرداخت وجه را انتخاب کنید.</span></label>
    {!accounts.length && <p className="text-xs leading-6 text-slate-600">ابتدا حساب فعال و بدون زیرحساب در <Link href="/dashboard/accounts" className="font-semibold text-emerald-700 underline">کدینگ حساب‌ها</Link> تعریف کنید.</p>}
    <label className="block text-sm font-medium">مبلغ پرداخت (ریال)<input required inputMode="numeric" dir="ltr" maxLength={20} value={amount} onChange={(event) => setAmount(event.target.value)} className={field} /></label>
    <label className="block text-sm font-medium">روش پرداخت<select value={method} onChange={(event) => setMethod(event.target.value as PaymentInput["method"])} className={field}><option value="CASH">نقدی</option><option value="BANK_TRANSFER">انتقال بانکی</option><option value="OTHER">سایر</option></select></label>
    <label className="block text-sm font-medium">شرح (اختیاری)<input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} className={field} /></label>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm leading-7 text-red-700">{error}</p>}{success && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm leading-7 text-emerald-800">{success}</p>}
    <button disabled={pending} className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">پیش‌نمایش پرداخت</button>
  </fieldset>
    {review && <section aria-label="پیش‌نمایش پرداخت" className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4"><h3 className="font-semibold text-emerald-950">پیش‌نمایش سند پرداخت</h3><p className="mt-2 text-xs leading-6 text-slate-600">با تأیید، پرداخت و سند حسابداری ثبت می‌شوند. مانده بدهی کنترل نمی‌شود.</p><dl className="mt-3 space-y-3 text-sm"><div><dt className="font-semibold">بدهکار · پرداختنی تأمین‌کننده</dt><dd className="mt-1">{supplier?.payable?.code} — {supplier?.payable?.name} · {money(normalizedAmount)} ریال</dd></div><div><dt className="font-semibold">بستانکار · حساب تسویه</dt><dd className="mt-1">{account?.code} — {account?.name} · {money(normalizedAmount)} ریال</dd></div></dl>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}<div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={confirm} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "در حال ثبت…" : "تأیید و ثبت پرداخت"}</button><button type="button" disabled={pending} onClick={() => setReview(false)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50">بازگشت به ویرایش</button></div></section>}
  </form>;
}
