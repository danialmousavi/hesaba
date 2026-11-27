"use client";

import { organizationFetch as fetch } from "@/lib/organization-fetch";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CloseYearButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function closeYear() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/fiscal-years/${encodeURIComponent(id)}/close`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "بستن سال مالی انجام نشد."); return; }
      setConfirming(false);
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally { setPending(false); }
  }

  return <div className="mt-4 border-t border-slate-100 pt-4">
    {!confirming ? <button type="button" onClick={() => setConfirming(true)} className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-50">بستن سال بدون انتقال مانده</button> : <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-950">آیا از بستن «{name}» مطمئن هستید؟</p>
      <p className="mt-2 text-sm leading-7 text-amber-900">این گزینه سند اختتامیه یا افتتاحیه ایجاد نمی‌کند و مانده‌ها را منتقل نمی‌کند. بازگشایی سال بسته نیز فعلاً ممکن نیست. برای انتقال مانده از گزینه «اختتامیه و انتقال مانده» استفاده کنید.</p>
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={closeYear} className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900 disabled:opacity-60">{pending ? "در حال بستن…" : "تأیید بستن"}</button><button type="button" disabled={pending} onClick={() => { setConfirming(false); setError(""); }} className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm text-amber-950 disabled:opacity-60">انصراف</button></div>
    </div>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </div>;
}
