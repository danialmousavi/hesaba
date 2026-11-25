"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persianFa from "react-date-object/locales/persian_fa";
import gregorianEn from "react-date-object/locales/gregorian_en";

type Line = { accountId: string; debit: string; credit: string };
type Account = { id: string; code: string; name: string; type: string; balance: string };
type Preview = { fiscalYear: { name: string; endDate: string }; nextYear: { name: string; startDate: string; endDate: string }; equityAccountId: string; sourceJournalCount: number; drafts: { journals: number; transactions: number; invoices: number; payments: number }; accountDetails: { id: string; parties: { purpose: string; party: { name: string } }[] }[]; blockers: string[]; canConfirm: boolean; previewFingerprint: string; calculation: { result: string; balances: Account[]; temporaryLines: Line[]; closingLines: Line[]; openingLines: Line[] } | null };
type Input = { equityAccountId: string; nextYear: { name: string; startDate: string; endDate: string }; previewFingerprint: string; requestKey: string };
type Result = { id: string; targetYear: { id: string; name: string }; result: string; entries: { temporary: { id: string; number: number } | null; permanent: { id: string; number: number } | null; opening: { id: string; number: number } | null } };
const field = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const persianDate = (value: string) => new DateObject({ date: value, format: "YYYY-MM-DD", calendar: gregorian, locale: gregorianEn }).convert(persian, persianFa);
const dateFormat = (value: string) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
const money = (value: string) => BigInt(value).toLocaleString("fa-IR");
const nextDate = (value: string) => { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10); };

export function ClosingResult({ closing }: { closing: Result }) {
  const rows = [["بستن حساب‌های موقت", closing.entries.temporary], ["اختتامیه حساب‌های دائمی", closing.entries.permanent], ["افتتاحیه سال جدید", closing.entries.opening]] as const;
  return <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-950"><p className="font-semibold">اختتامیه و انتقال مانده ثبت شده است.</p><p>سال مقصد: {closing.targetYear.name} · نتیجه دوره: {money(closing.result)} ریال</p><ul className="mt-2 space-y-1">{rows.map(([label, entry]) => <li key={label}>{label}: {entry ? <Link href={`/dashboard/journal#journal-${entry.id}`} className="font-semibold underline">سند شماره {entry.number.toLocaleString("fa-IR")}</Link> : "بدون سند؛ مانده صفر"}</li>)}</ul></div>;
}

function readStored(raw: string | null): Input | null {
  if (!raw) return null;
  try { const value = JSON.parse(raw) as Input; return value && typeof value.equityAccountId === "string" && typeof value.nextYear?.name === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.nextYear.startDate) && /^\d{4}-\d{2}-\d{2}$/.test(value.nextYear.endDate) && /^[a-f0-9]{64}$/.test(value.previewFingerprint) && /^[a-f0-9-]{36}$/i.test(value.requestKey) ? value : null; } catch { return null; }
}

export function ClosingPanel({ year, accounts, storageKey }: { year: { id: string; name: string; endDate: string }; accounts: { id: string; code: string; name: string }[]; storageKey: string }) {
  const router = useRouter();
  const endId = useId();
  const inFlight = useRef(false);
  const startDate = nextDate(year.endDate);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [equity, setEquity] = useState("");
  const [endDate, setEndDate] = useState<DateObject | null>(() => persianDate(startDate).add(1, "year").subtract(1, "day"));
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [recovery, setRecovery] = useState<Input | null>(null);
  const [ready, setReady] = useState(false);
  const [storageProblem, setStorageProblem] = useState(false);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try { const raw = sessionStorage.getItem(storageKey); const stored = readStored(raw); setRecovery(stored); setStorageProblem(!!raw && !stored); }
      catch { setStorageProblem(true); }
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [storageKey]);

  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPreview(null);
    if (!name.trim() || name.trim().length < 2 || !equity || !endDate?.isValid) { setError("نام سال جدید، حساب نتیجه دوره و تاریخ پایان را مشخص کنید."); return; }
    const end = new DateObject(endDate).convert(gregorian, gregorianEn).format("YYYY-MM-DD");
    if (end <= startDate) { setError("تاریخ پایان باید پس از شروع سال جدید باشد."); return; }
    setPending(true);
    try {
      const response = await fetch(`/api/fiscal-years/${encodeURIComponent(year.id)}/closing-preview`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ equityAccountId: equity, nextYear: { name: name.trim(), startDate, endDate: end } }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "دریافت پیش‌نمایش انجام نشد."); return; }
      setPreview(data);
    } catch { setError("ارتباط با سرور برقرار نشد؛ پیش‌نمایش را دوباره دریافت کنید."); }
    finally { setPending(false); }
  }

  async function send(payload: Input, uncertain: boolean) {
    if (inFlight.current) return;
    inFlight.current = true; setPending(true); setError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(`/api/fiscal-years/${encodeURIComponent(year.id)}/closing`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: controller.signal });
      const body = await response.json();
      if (!response.ok) {
        if (response.status < 500 && !uncertain) { sessionStorage.removeItem(storageKey); setRecovery(null); setPreview(null); setError(body.error || "ثبت اختتامیه انجام نشد؛ پیش‌نمایش تازه بگیرید."); router.refresh(); }
        else { setRecovery(payload); setError("نتیجه درخواست مشخص نیست. وضعیت سال را بررسی کنید یا همین درخواست را دوباره بررسی کنید."); }
        return;
      }
      sessionStorage.removeItem(storageKey); setRecovery(null); setPreview(null); setResult(body.closing); router.refresh();
    } catch { setRecovery(payload); setError("پاسخ سرور دریافت نشد. وضعیت سال را بررسی کنید یا همین درخواست را دوباره بررسی کنید."); }
    finally { window.clearTimeout(timeout); inFlight.current = false; setPending(false); }
  }

  function confirm() {
    if (!preview?.canConfirm || inFlight.current || !ready || storageProblem || recovery) return;
    const payload: Input = { equityAccountId: preview.equityAccountId, nextYear: preview.nextYear, previewFingerprint: preview.previewFingerprint, requestKey: crypto.randomUUID() };
    try { sessionStorage.setItem(storageKey, JSON.stringify(payload)); setRecovery(payload); }
    catch { setStorageProblem(true); setError("امکان نگهداری امن درخواست در این زبانه وجود ندارد؛ تنظیمات مرورگر را بررسی کنید."); return; }
    void send(payload, false);
  }
  const accountsById = new Map(preview?.calculation?.balances.map((account) => [account.id, account]) ?? []);
  function renderLines(title: string, lines: Line[]) {
    const debit = lines.reduce((sum, line) => sum + BigInt(line.debit), 0n);
    const credit = lines.reduce((sum, line) => sum + BigInt(line.credit), 0n);
    return <section className="rounded-xl border border-slate-200 bg-white p-3"><h5 className="font-semibold text-slate-900">{title}</h5>{!lines.length ? <p className="mt-2 text-sm text-slate-500">مانده‌ای برای ثبت سند وجود ندارد.</p> : <><ul className="mt-3 space-y-2">{lines.map((line) => { const account = accountsById.get(line.accountId); return <li key={line.accountId} className="rounded-lg bg-slate-50 p-3 text-sm leading-7"><p className="break-words">{account ? `${account.code} — ${account.name}` : line.accountId}</p><p className="text-slate-600">بدهکار: {money(line.debit)} · بستانکار: {money(line.credit)} ریال</p></li>; })}</ul><p className="mt-3 text-sm font-semibold leading-7 text-slate-700">جمع بدهکار: {debit.toLocaleString("fa-IR")} · جمع بستانکار: {credit.toLocaleString("fa-IR")} ریال</p></>}</section>;
  }
  return <div className="mt-4 border-t border-slate-100 pt-4">
    {result && <ClosingResult closing={result} />}
    {!ready ? <p className="text-sm text-slate-500">در حال آماده‌سازی…</p> : storageProblem ? <p role="alert" className="text-sm leading-7 text-red-700">دسترسی به اطلاعات درخواست قبلی ممکن نیست. وضعیت سال و اختتامیه را بررسی کنید و سپس مشکل حافظه مرورگر را رفع کنید.</p> : recovery ? <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-7 text-amber-950"><p className="font-semibold">{pending ? "در حال بررسی درخواست اختتامیه" : "درخواست اختتامیه با نتیجه نامشخص"}</p><p className="mt-2">ابتدا وضعیت سال و سندها را بررسی کنید. بررسی دوباره با همان شناسه انجام می‌شود.</p><button type="button" disabled={pending} onClick={() => void send(recovery, true)} className="mt-3 rounded-lg bg-amber-800 px-4 py-2 font-semibold text-white disabled:opacity-50">{pending ? "در حال بررسی…" : "بررسی دوباره همین درخواست"}</button><Link href="/dashboard/journal" className="mr-3 font-semibold underline">مشاهده اسناد</Link></div> : !open ? <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">اختتامیه و انتقال مانده</button> : <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/30 p-4">
      <div><h4 className="font-semibold text-slate-900">اختتامیه «{year.name}»</h4><p className="mt-2 text-sm leading-7 text-slate-600">سال فعلی بسته و سال جدید ایجاد می‌شود. سندهای حسابداری پس از تأیید نهایی ثبت می‌شوند؛ بازگشایی خودکار سال بسته فعلاً وجود ندارد.</p></div>
      <form onSubmit={prepare} className="space-y-3"><label className="block text-sm font-medium">نام سال مالی جدید<input className={field} value={name} onChange={(event) => { setName(event.target.value); setPreview(null); }} maxLength={100} disabled={pending} placeholder="نام سال مالی جدید" /></label><label className="block text-sm font-medium">حساب نتیجه دوره<select value={equity} onChange={(event) => { setEquity(event.target.value); setPreview(null); }} disabled={pending} className={field}><option value="">انتخاب حساب سرمایه</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}</select></label>{!accounts.length && <p className="text-sm leading-7 text-amber-800">حساب سرمایه فعال و بدون زیرحساب وجود ندارد. آن را در <Link href="/dashboard/accounts" className="underline">کدینگ حساب‌ها</Link> ایجاد کنید.</p>}<p className="text-sm text-slate-700">شروع سال جدید: {dateFormat(startDate)}، روز بعد از پایان سال فعلی</p><div className="text-sm font-medium"><label htmlFor={endId}>پایان سال مالی جدید</label><DatePicker id={endId} value={endDate} onChange={(value) => { setEndDate(value); setPreview(null); }} minDate={persianDate(nextDate(startDate))} calendar={persian} locale={persianFa} format="YYYY/MM/DD" inputClass={field} containerClassName="w-full" editable={false} placeholder="انتخاب تاریخ پایان شمسی" disabled={pending} /></div><div className="flex flex-wrap gap-2"><button type="submit" disabled={pending} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "در حال دریافت…" : "دریافت پیش‌نمایش"}</button><button type="button" disabled={pending} onClick={() => { setOpen(false); setPreview(null); setError(""); }} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm">انصراف</button></div></form>
      {preview && <div className="space-y-4 border-t border-emerald-200 pt-4"><div><h4 className="font-semibold text-slate-900">پیش‌نمایش اختتامیه</h4><p className="mt-2 text-sm leading-7 text-slate-600">{preview.sourceJournalCount.toLocaleString("fa-IR")} سند نهایی بررسی شد. مقصد: {preview.nextYear.name}، از {dateFormat(preview.nextYear.startDate)} تا {dateFormat(preview.nextYear.endDate)}.</p><p className="text-sm leading-7 text-slate-600">پیش‌نویس‌ها: سند {preview.drafts.journals.toLocaleString("fa-IR")}، درآمد و هزینه {preview.drafts.transactions.toLocaleString("fa-IR")}، فاکتور {preview.drafts.invoices.toLocaleString("fa-IR")}، دریافت و پرداخت {preview.drafts.payments.toLocaleString("fa-IR")}.</p></div>{preview.blockers.length > 0 && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm leading-7 text-red-800"><p className="font-semibold">مواردی که مانع ثبت هستند:</p><ul className="list-inside list-disc">{preview.blockers.map((blocker, index) => <li key={index}>{blocker}</li>)}</ul></div>}{preview.calculation && <><p className="rounded-lg bg-white p-3 text-sm font-semibold">نتیجه دوره: {money(preview.calculation.result)} ریال</p>{renderLines("بستن حساب‌های موقت", preview.calculation.temporaryLines)}{renderLines("اختتامیه حساب‌های دائمی", preview.calculation.closingLines)}{renderLines("افتتاحیه سال جدید", preview.calculation.openingLines)}<details className="rounded-lg bg-white p-3 text-sm"><summary className="cursor-pointer font-semibold">مانده حساب‌ها پیش از اختتامیه</summary><ul className="mt-3 space-y-2">{preview.calculation.balances.map((account) => <li key={account.id} className="break-words leading-7">{account.code} — {account.name}: {money(account.balance)} ریال {preview.accountDetails.find((item) => item.id === account.id)?.parties.map((item) => ` · ${item.party.name} (${item.purpose === "RECEIVABLE" ? "دریافتنی" : "پرداختنی"})`).join("")}</li>)}</ul></details></>}{preview.canConfirm && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-950">با تأیید، سال بسته، مانده‌ها منتقل و سندهای نمایش‌داده‌شده ثبت نهایی می‌شوند.</p><button type="button" disabled={pending} onClick={confirm} className="mt-3 rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "در حال ثبت…" : "تأیید نهایی اختتامیه و انتقال"}</button></div>}</div>}
    </div>}
    {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm leading-7 text-red-700">{error}</p>}
  </div>;
}
