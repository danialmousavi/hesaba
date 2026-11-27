"use client";

import { organizationFetch as fetch } from "@/lib/organization-fetch";

import { useId, useState, type FormEvent } from "react";
import { normalizeDigits, validPrice, type Product } from "./product-types";

const input = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const secondary = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60";

export function ProductControls({ product, onUpdated }: { product: Product; onUpdated: (name: string) => void }) {
  const hintId = useId();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function update(data: Record<string, string | boolean | null>) {
    setError(""); setPending(true);
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(product.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const body = await response.json();
      if (!response.ok) { setError(body.error || "ذخیره تغییرات انجام نشد."); return; }
      setEditing(false); setConfirming(false); onUpdated(body.product.name);
    } catch { setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setPending(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const salePrice = normalizeDigits(String(data.get("salePrice") ?? ""));
    const purchasePrice = normalizeDigits(String(data.get("purchasePrice") ?? ""));
    if (!validPrice(salePrice) || (purchasePrice && !validPrice(purchasePrice))) { setError("قیمت‌ها باید عدد صحیح نامنفی، بدون جداکننده و حداکثر ۲۰ رقم باشند."); return; }
    void update({ name: String(data.get("name") ?? ""), code: String(data.get("code") ?? ""), type: String(data.get("type") ?? ""), unit: String(data.get("unit") ?? ""), salePrice, purchasePrice: purchasePrice || null, description: String(data.get("description") ?? "") });
  }

  return <div className="mt-4 border-t border-slate-100 pt-4">
    {!editing && !confirming && <div className="flex flex-wrap gap-2"><button type="button" className={secondary} onClick={() => { setError(""); setEditing(true); }}>ویرایش اطلاعات</button><button type="button" className={secondary} onClick={() => { setError(""); setConfirming(true); }}>{product.isActive ? "غیرفعال‌کردن" : "فعال‌کردن"}</button></div>}
    {editing && <form onSubmit={submit} className="space-y-4"><h4 className="text-sm font-bold">ویرایش {product.name}</h4>
      <label className="block text-sm font-medium">نام<input name="name" defaultValue={product.name} required maxLength={150} className={input} /></label>
      <label className="block text-sm font-medium">کد<input name="code" defaultValue={product.code} required maxLength={50} className={input} /></label>
      <label className="block text-sm font-medium">نوع<select name="type" defaultValue={product.type} className={input}><option value="GOODS">کالا</option><option value="SERVICE">خدمت</option></select></label>
      <label className="block text-sm font-medium">واحد<input name="unit" defaultValue={product.unit} required maxLength={50} className={input} /></label>
      <label className="block text-sm font-medium">قیمت فروش (ریال)<input name="salePrice" defaultValue={product.salePrice} required inputMode="numeric" maxLength={20} dir="ltr" aria-describedby={hintId} className={input} /></label>
      <label className="block text-sm font-medium">قیمت خرید (ریال، اختیاری)<input name="purchasePrice" defaultValue={product.purchasePrice ?? ""} inputMode="numeric" maxLength={20} dir="ltr" aria-describedby={hintId} className={input} /></label>
      <p id={hintId} className="text-xs leading-6 text-slate-500">قیمت را به ریال، بدون اعشار و جداکننده وارد کنید؛ صفر مجاز است.</p>
      <label className="block text-sm font-medium">توضیحات<textarea name="description" defaultValue={product.description ?? ""} rows={3} maxLength={1000} className={input} /></label>
      <div className="flex flex-wrap gap-2"><button disabled={pending} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{pending ? "در حال ذخیره…" : "ذخیره تغییرات"}</button><button type="button" disabled={pending} className={secondary} onClick={() => { setEditing(false); setError(""); }}>انصراف</button></div>
    </form>}
    {confirming && <div className="rounded-lg bg-amber-50 p-4"><p className="text-sm leading-6 text-amber-950">آیا می‌خواهید «{product.name}» را {product.isActive ? "غیرفعال" : "فعال"} کنید؟</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={() => void update({ isActive: !product.isActive })} className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? "در حال ثبت…" : "تأیید"}</button><button type="button" disabled={pending} className={secondary} onClick={() => { setConfirming(false); setError(""); }}>انصراف</button></div></div>}
    {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  </div>;
}
