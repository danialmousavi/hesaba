"use client";

import { useState } from "react";
import Link from "next/link";
import { InvoiceForm } from "./invoice-form";
import { InvoiceList } from "./invoice-list";
import type { Customer, Invoice, IssueAccount, Product, Year } from "./types";

export function Invoices({ years, customers, products, accounts, canWrite }: { years: Year[]; customers: Customer[]; products: Product[]; accounts: IssueAccount[]; canWrite: boolean }) {
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [editSession, setEditSession] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const openYear = years.find((year) => year.status === "OPEN");
  const editingYear = editing ? years.find((year) => year.id === editing.fiscalYearId && year.status === "OPEN") : undefined;
  function selectInvoice(invoice: Invoice) {
    if (dirty && !window.confirm("تغییرات ذخیره‌نشده فرم فعلی کنار گذاشته شود؟")) return;
    setMessage(""); setDirty(false); setEditing(invoice); setEditSession((value) => value + 1);
    requestAnimationFrame(() => document.getElementById("invoice-form-heading")?.focus());
  }
  return <>
    <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">پیش‌نویس سند حسابداری ایجاد نمی‌کند و سال مالی دارای پیش‌نویس بسته نمی‌شود. صدور، فروش نسیه را ثبت می‌کند و به معنی دریافت وجه نیست.</p>
    {message && <p role="status" className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(350px,460px)_minmax(0,1fr)]">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 id="invoice-form-heading" tabIndex={-1} className="font-modam text-xl font-bold">{editing ? "ویرایش پیش‌نویس" : "فاکتور جدید"}</h2>
        {editing && editingYear ? <InvoiceForm key={`${editing.id}:${editSession}`} year={editingYear} customers={customers} products={products} initial={editing} onDirty={() => setDirty(true)} onPendingChange={setSaving} onCreated={() => { setDirty(false); setEditing(null); setMessage("تغییرات پیش‌نویس ذخیره شد."); setRevision((value) => value + 1); }} onCancel={() => { if (!dirty || window.confirm("تغییرات ذخیره‌نشده کنار گذاشته شود؟")) { setDirty(false); setEditing(null); } }} onConflict={() => setRevision((value) => value + 1)} /> :
        !canWrite ? <p className="mt-4 text-sm leading-7 text-slate-600">نقش مشاهده‌گر اجازه ثبت فاکتور ندارد.</p> : !openYear ? <p className="mt-4 text-sm leading-7 text-slate-600">برای ثبت فاکتور ابتدا یک <Link href="/dashboard/fiscal-years" className="font-semibold text-emerald-700 underline">سال مالی باز</Link> ایجاد کنید.</p> : !customers.length || !products.length ? <p className="mt-4 text-sm leading-7 text-slate-600">برای ثبت فاکتور به <Link href="/dashboard/parties" className="font-semibold text-emerald-700 underline">مشتری فعال</Link> و <Link href="/dashboard/products" className="font-semibold text-emerald-700 underline">کالا یا خدمت فعال</Link> نیاز دارید.</p> : <InvoiceForm year={openYear} customers={customers} products={products} onDirty={() => setDirty(true)} onPendingChange={setSaving} onConflict={() => setRevision((value) => value + 1)} onCreated={() => { setDirty(false); setRevision((value) => value + 1); }} />
        }
      </section>
      <InvoiceList years={years} customers={customers} accounts={accounts} canWrite={canWrite} revision={revision} onChanged={() => setRevision((value) => value + 1)} onEdit={selectInvoice} editingId={editing?.id} saving={saving} />
    </div>
  </>;
}
