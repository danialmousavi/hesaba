"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PostJournalButton({ id, number }: { id: string; number: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function post() {
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/journal-entries/${encodeURIComponent(id)}/post`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "ثبت نهایی انجام نشد."); return; }
      setConfirming(false); router.refresh();
    } catch { setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setPending(false); }
  }
  return <div className="mt-4 border-t border-slate-100 pt-4">{!confirming ? <button type="button" onClick={() => setConfirming(true)} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">ثبت نهایی سند</button> : <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-950">سند شمارهٔ {number} ثبت نهایی شود؟</p><p className="mt-2 text-sm leading-7 text-amber-900">پیش از تأیید، ردیف‌ها را بررسی کنید. برای اسناد مستقل، پس از ثبت امکان تهیهٔ پیش‌نویس برگشتی وجود دارد.</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={post} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? "در حال ثبت…" : "تأیید ثبت نهایی"}</button><button type="button" disabled={pending} onClick={() => { setConfirming(false); setError(""); }} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm">انصراف</button></div></div>}{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}</div>;
}
