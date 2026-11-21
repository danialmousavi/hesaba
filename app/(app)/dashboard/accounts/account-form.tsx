"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Account = { id: string; code: string; name: string; type: string; isActive: boolean };
const types = [{ value: "ASSET", label: "دارایی" }, { value: "LIABILITY", label: "بدهی" }, { value: "EQUITY", label: "سرمایه" }, { value: "REVENUE", label: "درآمد" }, { value: "EXPENSE", label: "هزینه" }];
const inputClass = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";

export function AccountForm({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [type, setType] = useState("ASSET");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setMessage(""); setPending(true);
    try {
      const response = await fetch("/api/ledger-accounts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: data.get("code"), name: data.get("name"), type, parentId: data.get("parentId") || null }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error || "ایجاد حساب انجام نشد."); return; }
      form.reset(); setType("ASSET"); router.refresh();
    } catch { setMessage("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="mt-5 space-y-4"><label className="block text-sm font-medium">کد حساب<input className={inputClass} name="code" dir="ltr" inputMode="numeric" pattern="[0-9]{1,20}" maxLength={20} required /><span className="mt-1 block text-xs text-slate-500">فقط ارقام انگلیسی، حداکثر ۲۰ رقم</span></label><label className="block text-sm font-medium">نام حساب<input className={inputClass} name="name" minLength={2} maxLength={100} required /></label><label className="block text-sm font-medium">نوع حساب<select className={inputClass} value={type} onChange={(event) => setType(event.target.value)}>{types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="block text-sm font-medium">حساب والد<select key={type} name="parentId" className={inputClass}><option value="">بدون والد (حساب اصلی)</option>{accounts.filter((account) => account.isActive && account.type === type).map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}</select></label>{message && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>}<button type="submit" disabled={pending} className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{pending ? "در حال ثبت…" : "ایجاد حساب"}</button></form>;
}
