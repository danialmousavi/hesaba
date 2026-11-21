"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persianFa from "react-date-object/locales/persian_fa";
import gregorianEn from "react-date-object/locales/gregorian_en";

type Line = { key: number; accountId: string; side: "debit" | "credit"; amount: string; description: string };
type Initial = { id: string; number: number; date: string; description: string; lines: { accountId: string; debit: string; credit: string; description: string | null }[] };
const field = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const normalize = (value: string) => value.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));

export function JournalForm({ year, accounts, initial }: { year: { id: string; name: string }; accounts: { id: string; name: string; code: string; isActive?: boolean }[]; initial?: Initial }) {
  const router = useRouter();
  const [date, setDate] = useState<DateObject | null>(() => initial ? new DateObject({ date: initial.date, format: "YYYY-MM-DD", calendar: gregorian, locale: gregorianEn }).convert(persian, persianFa) : null);
  const [lines, setLines] = useState<Line[]>(() => initial ? initial.lines.map((line, index) => ({ key: index, accountId: line.accountId, side: line.debit !== "0" ? "debit" : "credit", amount: line.debit !== "0" ? line.debit : line.credit, description: line.description ?? "" })) : [{ key: 0, accountId: "", side: "debit", amount: "", description: "" }, { key: 1, accountId: "", side: "credit", amount: "", description: "" }]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  function update(key: number, patch: Partial<Line>) { setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line)); }
  const total = (side: Line["side"]) => lines.filter((line) => line.side === side).reduce((sum, line) => /^\d{1,20}$/.test(normalize(line.amount)) ? sum + BigInt(normalize(line.amount)) : sum, 0n);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setMessage(""); setSuccess("");
    if (!date?.isValid) { setMessage("تاریخ سند را انتخاب کنید."); return; }
    const number = Number(normalize(String(data.get("number") ?? "")));
    const payload = { fiscalYearId: year.id, number, date: new DateObject(date).convert(gregorian, gregorianEn).format("YYYY-MM-DD"), description: data.get("description"), lines: lines.map((line) => ({ accountId: line.accountId, description: line.description, debit: line.side === "debit" ? normalize(line.amount).replace(/^0+(?=\d)/, "") : "0", credit: line.side === "credit" ? normalize(line.amount).replace(/^0+(?=\d)/, "") : "0" })) };
    if (!Number.isSafeInteger(number) || number < 1 || number > 2147483647 || lines.some((line) => !line.accountId || !/^\d{1,20}$/.test(normalize(line.amount)) || BigInt(normalize(line.amount)) === 0n)) { setMessage("شمارهٔ سند، حساب و مبلغ مثبت هر ردیف را بررسی کنید."); return; }
    setPending(true);
    try {
      const editPayload = { number: payload.number, date: payload.date, description: payload.description, lines: payload.lines };
      const response = await fetch(initial ? `/api/journal-entries/${encodeURIComponent(initial.id)}` : "/api/journal-entries", { method: initial ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(initial ? editPayload : payload) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error || "ایجاد پیش‌نویس انجام نشد."); return; }
      if (initial) { router.push("/dashboard/journal"); router.refresh(); return; }
      form.reset(); setDate(null); setLines([{ key: 0, accountId: "", side: "debit", amount: "", description: "" }, { key: 1, accountId: "", side: "credit", amount: "", description: "" }]); setSuccess("پیش‌نویس با موفقیت ذخیره شد."); router.refresh();
    } catch { setMessage("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="mt-5 space-y-4"><p className="text-sm text-slate-600">سال مالی: {year.name}</p><label className="block text-sm font-medium">شمارهٔ سند<input name="number" defaultValue={initial?.number} inputMode="numeric" className={field} required /></label><div className="text-sm font-medium"><label htmlFor="journal-date">تاریخ سند</label><DatePicker id="journal-date" value={date} onChange={setDate} calendar={persian} locale={persianFa} format="YYYY/MM/DD" inputClass={field} containerClassName="w-full" editable={false} placeholder="انتخاب تاریخ شمسی" /></div><label className="block text-sm font-medium">شرح سند<input name="description" defaultValue={initial?.description} maxLength={500} className={field} required /></label><fieldset className="space-y-3"><legend className="text-sm font-semibold">ردیف‌ها · مبلغ به ریال</legend>{lines.map((line, index) => <div key={line.key} className="rounded-xl border border-slate-200 p-3"><div className="flex justify-between"><p className="text-sm font-semibold">ردیف {index + 1}</p>{lines.length > 1 && <button type="button" onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} className="text-sm text-red-700">حذف ردیف</button>}</div><label className="mt-2 block text-sm">حساب<select value={line.accountId} onChange={(event) => update(line.key, { accountId: event.target.value })} className={field} required><option value="">انتخاب حساب</option>{accounts.map((account) => <option key={account.id} value={account.id} disabled={account.isActive === false}>{account.code} — {account.name}{account.isActive === false ? " (غیرفعال)" : ""}</option>)}</select></label><label className="mt-2 block text-sm">نوع مبلغ<select value={line.side} onChange={(event) => update(line.key, { side: event.target.value as Line["side"] })} className={field}><option value="debit">بدهکار</option><option value="credit">بستانکار</option></select></label><label className="mt-2 block text-sm">مبلغ<input value={line.amount} onChange={(event) => update(line.key, { amount: event.target.value })} inputMode="numeric" dir="ltr" maxLength={20} className={field} required /></label><label className="mt-2 block text-sm">شرح ردیف (اختیاری)<input value={line.description} onChange={(event) => update(line.key, { description: event.target.value })} maxLength={500} className={field} /></label></div>)}<button type="button" disabled={lines.length >= 100} onClick={() => setLines((current) => [...current, { key: Math.max(...current.map((line) => line.key)) + 1, accountId: "", side: "debit", amount: "", description: "" }])} className="text-sm font-semibold text-emerald-700 disabled:opacity-50">+ افزودن ردیف</button></fieldset><div className="rounded-lg bg-slate-50 p-3 text-sm leading-7 text-slate-700"><p>جمع بدهکار: {total("debit").toLocaleString("fa-IR")} ریال</p><p>جمع بستانکار: {total("credit").toLocaleString("fa-IR")} ریال</p><p>{total("debit") === total("credit") && total("debit") > 0n ? "مبالغ متوازن‌اند." : "پیش‌نویس می‌تواند نامتوازن باشد."}</p></div>{message && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>}{success && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}<button disabled={pending} className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{pending ? "در حال ذخیره…" : "ذخیره پیش‌نویس"}</button></form>;
}
