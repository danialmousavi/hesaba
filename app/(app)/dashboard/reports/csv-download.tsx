"use client";

import { useState } from "react";

export function CsvDownload({ url, filename }: { url: string; filename: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(typeof data?.error === "string" ? data.error : "دریافت فایل انجام نشد. دوباره تلاش کنید.");
        return;
      }
      if (!response.headers.get("content-type")?.toLowerCase().startsWith("text/csv")) {
        setError("فایل گزارش معتبر نیست. دوباره تلاش کنید.");
        return;
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setPending(false);
    }
  }

  return <div className="flex flex-wrap items-center gap-3">
    <button type="button" onClick={download} disabled={pending} className="rounded-lg border border-emerald-700 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60">{pending ? "در حال آماده‌سازی…" : "دانلود CSV"}</button>
    <span className="text-xs text-slate-500">فایل با اطلاعات لحظه دانلود ساخته می‌شود.</span>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
