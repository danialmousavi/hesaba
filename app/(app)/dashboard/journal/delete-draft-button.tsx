"use client";

import { organizationFetch as fetch } from "@/lib/organization-fetch";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteDraftButton({ id, number }: { id: string; number: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/journal-entries/${encodeURIComponent(id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "حذف پیش‌نویس انجام نشد."); return; }
      setConfirming(false);
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally { setPending(false); }
  }

  return <div className="mt-3">
    {!confirming ? <button type="button" onClick={() => setConfirming(true)} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">حذف پیش‌نویس</button> : <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-900">پیش‌نویس شمارهٔ {number} حذف شود؟</p>
      <p className="mt-2 text-sm leading-7 text-red-800">سند و همهٔ ردیف‌های آن به‌طور دائمی حذف می‌شوند و شمارهٔ سند می‌تواند دوباره استفاده شود.</p>
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={remove} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60">{pending ? "در حال حذف…" : "تأیید حذف"}</button><button type="button" disabled={pending} onClick={() => { setConfirming(false); setError(""); }} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm">انصراف</button></div>
    </div>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </div>;
}
