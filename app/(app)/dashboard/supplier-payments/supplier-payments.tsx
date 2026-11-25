"use client";

import { useState } from "react";
import Link from "next/link";
import { PaymentForm } from "./payment-form";
import { PaymentList } from "./payment-list";
import type { Account, Supplier, Year } from "./types";

export function SupplierPayments({ storageKey, year, suppliers, accounts, canWrite }: { storageKey: string; year: Year | null; suppliers: Supplier[]; accounts: Account[]; canWrite: boolean }) {
  const [revision, setRevision] = useState(0);
  return <>
    <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">پرداخت به فاکتور خرید تخصیص نمی‌یابد و مانده بدهی بررسی نمی‌شود؛ پرداخت بیش از بدهی می‌تواند پیش‌پرداخت باشد.</p>
    <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(350px,460px)_minmax(0,1fr)]">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="font-modam text-xl font-bold">ثبت پرداخت</h2>
        {!canWrite ? <p className="mt-4 text-sm leading-7 text-slate-600">نقش مشاهده‌گر اجازه ثبت پرداخت ندارد.</p> : <>{!year && <p className="mt-4 text-sm leading-7 text-slate-600">برای پرداخت جدید ابتدا یک <Link href="/dashboard/fiscal-years" className="font-semibold text-emerald-700 underline">سال مالی باز</Link> ایجاد کنید.</p>}<PaymentForm storageKey={storageKey} year={year} suppliers={suppliers} accounts={accounts} onChanged={() => setRevision((value) => value + 1)} /></>}
      </section>
      <PaymentList key={revision} revision={revision} />
    </div>
  </>;
}
