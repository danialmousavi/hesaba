"use client";

import { organizationFetch as fetch } from "@/lib/organization-fetch";

import { useState, type FormEvent } from "react";

type Party = { id: string; name: string; isCustomer: boolean; isSupplier: boolean; isActive: boolean; phone: string | null; email: string | null; address: string | null };
const input = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const secondary = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60";

export function PartyControls({ party, onUpdated }: { party: Party; onUpdated: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function update(data: Record<string, string | boolean>) {
    setError(""); setPending(true);
    try {
      const response = await fetch(`/api/parties/${encodeURIComponent(party.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const body = await response.json();
      if (!response.ok) { setError(body.error || "ذخیره تغییرات انجام نشد."); return; }
      setEditing(false); setConfirming(false); onUpdated(body.party.name);
    } catch { setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setPending(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const isCustomer = data.has("isCustomer"), isSupplier = data.has("isSupplier");
    if (!isCustomer && !isSupplier) { setError("حداقل یک نقش برای شخص انتخاب کنید."); return; }
    void update({ name: String(data.get("name") ?? ""), isCustomer, isSupplier, phone: String(data.get("phone") ?? ""), email: String(data.get("email") ?? ""), address: String(data.get("address") ?? "") });
  }

  return <div className="mt-4 border-t border-slate-100 pt-4">
    {!editing && !confirming && <div className="flex flex-wrap gap-2"><button type="button" className={secondary} onClick={() => { setError(""); setEditing(true); }}>ویرایش اطلاعات</button><button type="button" className={secondary} onClick={() => { setError(""); setConfirming(true); }}>{party.isActive ? "غیرفعال‌کردن" : "فعال‌کردن"}</button></div>}
    {editing && <form onSubmit={submit} className="space-y-4"><h4 className="text-sm font-bold">ویرایش اطلاعات {party.name}</h4><label className="block text-sm font-medium">نام شخص<input name="name" defaultValue={party.name} required maxLength={150} className={input} /></label><fieldset><legend className="text-sm font-medium">نقش شخص</legend><div className="mt-3 flex flex-wrap gap-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" name="isCustomer" defaultChecked={party.isCustomer} className="accent-emerald-700" />مشتری</label><label className="flex items-center gap-2"><input type="checkbox" name="isSupplier" defaultChecked={party.isSupplier} className="accent-emerald-700" />تأمین‌کننده</label></div></fieldset><label className="block text-sm font-medium">شماره تماس<input name="phone" type="tel" defaultValue={party.phone ?? ""} maxLength={40} dir="ltr" className={input} /></label><label className="block text-sm font-medium">ایمیل<input name="email" type="email" defaultValue={party.email ?? ""} dir="ltr" className={input} /></label><label className="block text-sm font-medium">آدرس<textarea name="address" defaultValue={party.address ?? ""} rows={3} maxLength={1000} className={input} /></label><div className="flex flex-wrap gap-2"><button disabled={pending} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{pending ? "در حال ذخیره…" : "ذخیره تغییرات"}</button><button type="button" disabled={pending} className={secondary} onClick={() => { setEditing(false); setError(""); }}>انصراف</button></div></form>}
    {confirming && <div className="rounded-lg bg-amber-50 p-4"><p className="text-sm leading-6 text-amber-950">آیا می‌خواهید «{party.name}» را {party.isActive ? "غیرفعال" : "فعال"} کنید؟</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={() => void update({ isActive: !party.isActive })} className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? "در حال ثبت…" : "تأیید"}</button><button type="button" disabled={pending} className={secondary} onClick={() => { setConfirming(false); setError(""); }}>انصراف</button></div></div>}
    {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  </div>;
}
