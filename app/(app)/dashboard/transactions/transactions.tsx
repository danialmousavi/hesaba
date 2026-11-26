"use client";

import { useState } from "react";
import type { Account, Year } from "./types";
import { TransactionForm } from "./transaction-form";
import { DraftList } from "./draft-list";

export function Transactions({ years, accounts, canWrite }: { years: Year[]; accounts: Account[]; canWrite: boolean }) {
  const [revision, setRevision] = useState(0);
  const openYear = years.find((year) => year.status === "OPEN");
  return <>
    <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">پیش‌نویس تا زمان ثبت نهایی در گزارش‌ها و داشبورد محاسبه نمی‌شود. با ثبت نهایی، سند حسابداری ایجاد می‌شود؛ سال مالی دارای پیش‌نویس نیز بسته نمی‌شود.</p>
    <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="font-modam text-xl font-bold">ثبت پیش‌نویس</h2>
        {!canWrite ? <p className="mt-4 text-sm leading-7 text-slate-600">نقش مشاهده‌گر اجازه ثبت پیش‌نویس ندارد.</p> : !openYear ? <p className="mt-4 text-sm leading-7 text-slate-600">برای ثبت پیش‌نویس ابتدا یک سال مالی باز ایجاد کنید.</p> : <TransactionForm year={openYear} accounts={accounts} onCreated={() => setRevision((value) => value + 1)} />}
      </section>
      <DraftList years={years} accounts={accounts} canWrite={canWrite} revision={revision} onChanged={() => setRevision((value) => value + 1)} />
    </div>
  </>;
}
