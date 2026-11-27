"use client";

import { organizationFetch as fetch } from "@/lib/organization-fetch";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Account = { id: string; code: string; name: string; isActive: boolean };
const inputClass = "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";

export function AccountControls({ account }: { account: Account }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");

  async function update(data: { name?: string; code?: string; isActive?: boolean }) {
    setPending(true); setMessage(""); setSuccess("");
    try {
      const response = await fetch(`/api/ledger-accounts/${encodeURIComponent(account.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error || "تغییر حساب انجام نشد."); return; }
      setEditing(false); setConfirming(false); setSuccess("تغییرات حساب ذخیره شد."); router.refresh();
    } catch { setMessage("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setPending(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void update({ name: String(form.get("name") ?? ""), code: String(form.get("code") ?? "") });
  }

  return <div className="mt-4 border-t border-slate-100 pt-3">
    {!editing && !confirming && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setMessage(""); setSuccess(""); setEditing(true); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">ویرایش</button><button type="button" onClick={() => { setMessage(""); setSuccess(""); setConfirming(true); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{account.isActive ? "غیرفعال‌کردن" : "فعال‌کردن"}</button></div>}
    {editing && <form onSubmit={submit} className="space-y-3"><label className="block text-sm font-medium">نام حساب<input name="name" defaultValue={account.name} minLength={2} maxLength={100} required className={inputClass} /></label><label className="block text-sm font-medium">کد حساب<input name="code" defaultValue={account.code} dir="ltr" inputMode="numeric" pattern="[0-9]{1,20}" maxLength={20} required className={inputClass} /><span className="mt-1 block text-xs text-slate-500">فقط ارقام انگلیسی، حداکثر ۲۰ رقم</span></label><div className="flex gap-2"><button disabled={pending} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? "در حال ذخیره…" : "ذخیره تغییرات"}</button><button type="button" disabled={pending} onClick={() => { setEditing(false); setMessage(""); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">انصراف</button></div></form>}
    {confirming && <div className="rounded-lg bg-amber-50 p-3"><p className="text-sm leading-6 text-amber-950">آیا از {account.isActive ? "غیرفعال‌کردن" : "فعال‌کردن"} حساب «{account.name}» مطمئن هستید؟</p><div className="mt-3 flex gap-2"><button type="button" disabled={pending} onClick={() => void update({ isActive: !account.isActive })} className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? "در حال ثبت…" : "تأیید"}</button><button type="button" disabled={pending} onClick={() => { setConfirming(false); setMessage(""); }} className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm">انصراف</button></div></div>}
    {message && <p role="alert" className="mt-3 text-sm text-red-700">{message}</p>}{success && <p role="status" className="mt-3 text-sm text-emerald-700">{success}</p>}
  </div>;
}
