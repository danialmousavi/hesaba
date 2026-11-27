"use client";

import { useEffect, useRef, useState } from "react";
import { invalidateOrganizationRequests } from "@/lib/organization-fetch";

type Organization = { id: string; name: string; slug: string };
type Membership = { organizationId: string; role: "ADMIN" | "ACCOUNTANT" | "VIEWER"; organization: Organization };
type Selection = { state: string; active: { organization: Organization; role: Membership["role"] } | null; memberships: Membership[] };
const roleNames = { ADMIN: "مدیر", ACCOUNTANT: "حسابدار", VIEWER: "مشاهده‌گر" } as const;
const channelName = "hesaba-organization-change";

function currentPageOrganizationId() {
  return document.querySelector<HTMLElement>("[data-active-organization-id]")?.dataset.activeOrganizationId;
}

export function OrganizationPicker({ standalone = false }: { standalone?: boolean }) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [selected, setSelected] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [changedElsewhere, setChangedElsewhere] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reloadButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/organizations/active", { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "دریافت سازمان‌ها انجام نشد.");
        if (!controller.signal.aborted) { setSelection(data); setSelected(data.active?.organization.id ?? ""); setError(""); }
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "ارتباط با سرور برقرار نشد.");
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    let disposed = false;
    const notice = (organizationId?: string) => {
      if (organizationId && organizationId === currentPageOrganizationId()) return;
      if (!disposed) {
        invalidateOrganizationRequests();
        setChangedElsewhere(true);
      }
    };
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(channelName);
    if (channel) channel.onmessage = (event) => { if (event.data?.type === "changed") notice(event.data.organizationId); };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== channelName || !event.newValue) return;
      try { notice(JSON.parse(event.newValue).organizationId); } catch { notice(); }
    };
    window.addEventListener("storage", onStorage);
    return () => { disposed = true; channel?.close(); window.removeEventListener("storage", onStorage); };
  }, []);

  useEffect(() => {
    const pageOrganizationId = currentPageOrganizationId();
    if (standalone || !pageOrganizationId || !selection?.active) return;
    let disposed = false;
    const checkSelection = async () => {
      try {
        const result = await window.fetch("/api/organizations/active", { cache: "no-store" });
        const data = await result.json();
        if (!result.ok || data.state !== "ACTIVE" || data.active?.organization?.id !== pageOrganizationId) {
          if (!disposed) {
            invalidateOrganizationRequests();
            setChangedElsewhere(true);
          }
        }
      } catch {
        // A transient network failure is shown by the next user operation; do not discard the current screen.
      }
    };
    const interval = window.setInterval(() => { void checkSelection(); }, 15_000);
    window.addEventListener("focus", checkSelection);
    return () => { disposed = true; window.clearInterval(interval); window.removeEventListener("focus", checkSelection); };
  }, [selection?.active?.organization?.id, standalone]);

  useEffect(() => {
    if (!changedElsewhere) return;
    const frame = window.requestAnimationFrame(() => reloadButton.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [changedElsewhere]);

  async function change() {
    if (!selected || selected === selection?.active?.organization.id || pending) return;
    if (!standalone && !window.confirm("با تغییر سازمان، اطلاعات ذخیره‌نشده این صفحه از دست می‌رود. ادامه می‌دهید؟")) return;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/organizations/active", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ organizationId: selected }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "تغییر سازمان انجام نشد."); return; }
      const message = { type: "changed", organizationId: selected, id: crypto.randomUUID() };
      if (typeof BroadcastChannel !== "undefined") { const channel = new BroadcastChannel(channelName); channel.postMessage(message); channel.close(); }
      try { localStorage.setItem(channelName, JSON.stringify(message)); localStorage.removeItem(channelName); } catch { /* Storage may be disabled; BroadcastChannel remains available where supported. */ }
      window.location.replace(new URL("/dashboard", window.location.origin).href);
    } catch { setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setPending(false); }
  }

  return <div className={standalone ? "space-y-4" : "text-right"}>
    {changedElsewhere && <div role="alertdialog" aria-modal="true" aria-labelledby="organization-changed-title" aria-describedby="organization-changed-description" className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-5"><div className="max-w-md rounded-2xl bg-white p-6 shadow-xl"><h2 id="organization-changed-title" className="font-modam text-lg font-bold">سازمان یا دسترسی این نشست تغییر کرده است</h2><p id="organization-changed-description" className="mt-3 text-sm leading-7 text-slate-600">برای مشاهده اطلاعات مجاز فعلی باید صفحه را بازخوانی کنید. اطلاعات ذخیره‌نشده این صفحه ممکن است از دست برود.</p><button ref={reloadButton} type="button" onClick={() => window.location.replace(new URL("/dashboard", window.location.origin).href)} className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">بازخوانی صفحه</button></div></div>}
    {error && <p role="alert" className="text-sm text-red-700">{error} <button type="button" onClick={() => setAttempt((value) => value + 1)} className="underline">تلاش دوباره</button></p>}
    {!selection && !error && <p role="status" className="text-sm text-slate-500">در حال دریافت سازمان‌ها…</p>}
    {selection && <div className="flex flex-wrap items-end gap-2">
      <label className="block min-w-48 text-xs font-medium text-slate-600">سازمان فعال<select value={selected} onChange={(event) => setSelected(event.target.value)} disabled={pending} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"><option value="">انتخاب سازمان</option>{selection.memberships.map((item) => <option key={item.organizationId} value={item.organizationId}>{item.organization.name} · {roleNames[item.role]}</option>)}</select></label>
      <button type="button" onClick={change} disabled={pending || !selected || selected === selection.active?.organization.id} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "در حال تغییر…" : "تغییر سازمان"}</button>
      {selection.active && <span className="text-xs text-slate-500">نقش: {roleNames[selection.active.role]}</span>}
      {standalone && selection.active && <a href="/dashboard" className="text-sm font-semibold text-emerald-700 underline">ورود به داشبورد</a>}
      {selection.memberships.length === 0 && <p className="text-sm text-slate-600">عضویت فعالی برای این حساب وجود ندارد.</p>}
    </div>}
  </div>;
}
