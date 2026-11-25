"use client";

import { useState } from "react";
import Link from "next/link";
import { ReceiptForm } from "./receipt-form";
import { ReceiptList } from "./receipt-list";
import type { Account, Customer, Year } from "./types";

export function Receipts({ storageKey, year, customers, accounts, canWrite }: { storageKey: string; year: Year | null; customers: Customer[]; accounts: Account[]; canWrite: boolean }) {
  const [revision, setRevision] = useState(0);
  return <>
    <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">هر دریافت به فاکتورهای صادرشده همان مشتری تخصیص می‌یابد و سند حسابداری ایجاد می‌کند. پیش‌دریافت بدون تخصیص هنوز پشتیبانی نمی‌شود.</p>
    <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(350px,460px)_minmax(0,1fr)]">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="font-modam text-xl font-bold">ثبت دریافت</h2>
        {!canWrite ? <p className="mt-4 text-sm leading-7 text-slate-600">نقش مشاهده‌گر اجازه ثبت دریافت ندارد.</p> : <>{!year && <p className="mt-4 text-sm leading-7 text-slate-600">برای دریافت جدید ابتدا یک <Link href="/dashboard/fiscal-years" className="font-semibold text-emerald-700 underline">سال مالی باز</Link> ایجاد کنید.</p>}<ReceiptForm storageKey={storageKey} year={year} customers={customers} accounts={accounts} onChanged={() => setRevision((value) => value + 1)} /></>}
      </section>
      <ReceiptList revision={revision} />
    </div>
  </>;
}
