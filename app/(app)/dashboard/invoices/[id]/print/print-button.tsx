"use client";

import { organizationFetch as fetch } from "@/lib/organization-fetch";

import { useRef, useState } from "react";

export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">چاپ فاکتور</button>;
}

export function DownloadPdfButton({ id, number }: { id: string; number: number | null }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  async function download() {
    if (inFlight.current) return;
    inFlight.current = true; setPending(true); setError("");
    try {
      const response = await fetch(`/api/invoices/${encodeURIComponent(id)}/pdf`, { cache: "no-store" });
      if (!response.ok) { const body = await response.json().catch(() => null); setError(body?.error || "دریافت PDF انجام نشد."); return; }
      if (!response.headers.get("content-type")?.startsWith("application/pdf")) { setError("فایل دریافتی PDF معتبر نیست."); return; }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `invoice-${number ?? "draft"}-${id}.pdf`; document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید."); }
    finally { inFlight.current = false; setPending(false); }
  }
  return <div><button type="button" onClick={download} disabled={pending} className="rounded-lg border border-emerald-700 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">{pending ? "در حال ساخت PDF…" : "دانلود PDF"}</button>{error && <p role="alert" className="mt-2 max-w-md text-sm leading-7 text-red-700">{error}</p>}</div>;
}
