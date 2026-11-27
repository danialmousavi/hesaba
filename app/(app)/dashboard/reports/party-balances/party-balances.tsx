"use client";

import { organizationFetch as fetch } from "@/lib/organization-fetch";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { InvoiceBalances } from "./invoice-balances";
import type { Balance, PartyResult, Year } from "./types";

const field = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const money = (value: string) => BigInt(value).toLocaleString("fa-IR");
type Filters = { fiscalYearId: string; search: string; role: string; status: string; page: number };

function AccountBalance({ title, balance }: { title: string; balance: Balance | null }) {
  if (!balance) return <div className="rounded-xl bg-slate-50 p-3"><h4 className="text-sm font-semibold text-slate-700">{title}</h4><p className="mt-2 text-xs leading-6 text-slate-500">حسابی متصل نشده است.</p></div>;
  const balanceLabel = BigInt(balance.debitBalance) > 0n ? `بدهکار: ${money(balance.debitBalance)} ریال` : BigInt(balance.creditBalance) > 0n ? `بستانکار: ${money(balance.creditBalance)} ریال` : "بدون مانده";
  return <div className="min-w-0 rounded-xl bg-slate-50 p-3"><h4 className="text-sm font-semibold text-slate-700">{title}</h4><p className="mt-2 break-words text-sm text-slate-700"><bdi>{balance.account.code}</bdi> — {balance.account.name}{!balance.account.isActive && " (غیرفعال)"}</p><p className="mt-2 break-words text-sm font-bold text-slate-900">{balanceLabel}</p><p className="mt-2 text-xs leading-6 text-slate-500">گردش بدهکار: {money(balance.debit)} · گردش بستانکار: {money(balance.credit)} ریال</p></div>;
}

export function PartyBalances({ years }: { years: Year[] }) {
  const initialYear = years.find((year) => year.status === "OPEN")?.id ?? years[0].id;
  const [year, setYear] = useState(initialYear);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [filters, setFilters] = useState<Filters>({ fiscalYearId: initialYear, search: "", role: "all", status: "all", page: 1 });
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: PartyResult; error?: string } | null>(null);
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const query = new URLSearchParams({ fiscalYearId: filters.fiscalYearId, search: filters.search, role: filters.role, status: filters.status, page: String(filters.page), pageSize: "15" }).toString();
  const key = `${query}:${attempt}`;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/reports/party-balances?${query}`, { cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "دریافت گزارش انجام نشد.");
        if (!controller.signal.aborted) setResult({ key, data: body });
      } catch (error) { if (!controller.signal.aborted) setResult({ key, error: error instanceof Error ? error.message : "ارتباط با سرور برقرار نشد." }); }
    }
    void load(); return () => controller.abort();
  }, [query, key]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSelectedParty(null);
    setFilters({ fiscalYearId: year, search: search.trim(), role, status, page: 1 });
  }
  function changePage(delta: number) { setSelectedParty(null); setFilters((current) => ({ ...current, page: current.page + delta })); }
  const current = result?.key === key ? result : null;
  return <>
    <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">مانده حساب هر شخص گردش اسناد ثبت‌شده همان سال است. بدون سند افتتاحیه، مانده سال قبل به آن اضافه نمی‌شود. مانده فاکتور جداگانه و تا پایان سال محاسبه می‌شود؛ این دو را با هم جمع نکنید.</p>
    <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
      <form onSubmit={applyFilters} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="font-modam text-xl font-bold">فیلتر گزارش</h2>
        <label className="block text-sm font-medium">سال مالی<select value={year} onChange={(event) => setYear(event.target.value)} className={field}>{years.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.status === "OPEN" ? "باز" : "بسته"}</option>)}</select></label>
        <label className="block text-sm font-medium">نام شخص<input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={150} className={field} placeholder="جست‌وجوی نام" /></label>
        <label className="block text-sm font-medium">نقش<select value={role} onChange={(event) => setRole(event.target.value)} className={field}><option value="all">همه اشخاص</option><option value="customer">مشتری</option><option value="supplier">تأمین‌کننده</option></select></label>
        <label className="block text-sm font-medium">وضعیت<select value={status} onChange={(event) => setStatus(event.target.value)} className={field}><option value="all">همه وضعیت‌ها</option><option value="active">فعال</option><option value="inactive">غیرفعال</option></select></label>
        <button className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800">نمایش گزارش</button>
      </form>
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="font-modam text-xl font-bold">مانده حساب اشخاص</h2>
        {!current ? <p role="status" className="mt-5 text-sm text-slate-600">در حال دریافت گزارش…</p> : current.error ? <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{current.error} <button type="button" onClick={() => setAttempt((value) => value + 1)} className="font-semibold underline">تلاش دوباره</button></p> : current.data && <div className="mt-5"><p className="text-sm text-slate-500">{current.data.total.toLocaleString("fa-IR")} شخص · {current.data.fiscalYear.name}</p>
          {current.data.rows.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">شخصی با این شرایط پیدا نشد.</p> : <ul className="mt-4 space-y-3">{current.data.rows.map((party) => <li key={party.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="break-words font-semibold">{party.name}</h3><p className="mt-2 text-xs text-slate-500">{[party.isCustomer ? "مشتری" : null, party.isSupplier ? "تأمین‌کننده" : null].filter(Boolean).join(" · ")}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${party.isActive ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{party.isActive ? "فعال" : "غیرفعال"}</span></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2"><AccountBalance title="حساب دریافتنی" balance={party.receivable} /><AccountBalance title="حساب پرداختنی" balance={party.payable} /></div>
            <div className="mt-4 flex flex-wrap gap-3"><button type="button" aria-expanded={selectedParty === party.id} onClick={() => setSelectedParty((value) => value === party.id ? null : party.id)} className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">{selectedParty === party.id ? "بستن فاکتورها" : "مشاهده فاکتورها"}</button>{!party.receivable && !party.payable && <Link href="/dashboard/parties" className="self-center text-xs font-semibold text-emerald-700 underline">مدیریت اتصال حساب</Link>}</div>
            {selectedParty === party.id && <InvoiceBalances key={`${party.id}:${filters.fiscalYearId}`} partyId={party.id} fiscalYearId={filters.fiscalYearId} />}
          </li>)}</ul>}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={filters.page <= 1} onClick={() => changePage(-1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">صفحه قبل</button><span className="text-sm text-slate-600">صفحه {filters.page.toLocaleString("fa-IR")} از {Math.max(1, Math.ceil(current.data.total / current.data.pageSize)).toLocaleString("fa-IR")}</span><button type="button" disabled={filters.page * current.data.pageSize >= current.data.total} onClick={() => changePage(1)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">صفحه بعد</button></div>
        </div>}
      </section>
    </div>
  </>;
}
