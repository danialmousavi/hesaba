"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

type Party = { id: string; name: string; isActive: boolean; isCustomer: boolean; isSupplier: boolean };
type Purpose = "RECEIVABLE" | "PAYABLE";
type Account = { id: string; code: string; name: string; type: string; isActive: boolean; parentId: string | null };
type Link = { purpose: Purpose; firstUsedAt: string | null; account: { id: string; code: string; name: string; type: string; isActive: boolean } };
type Data = { links: Link[]; accounts: Account[] };
const selectClass = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50";
const secondary = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export function PartyAccounts({ party, canManage }: { party: Party; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return <div className="mt-4 border-t border-slate-100 pt-4">
    <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)} className="text-sm font-semibold text-emerald-700 underline underline-offset-4">{open ? "بستن حساب‌های شخص" : "مشاهده حساب‌های شخص"}</button>
    <div id={panelId}>{open && <AccountPanel party={party} canManage={canManage} />}</div>
  </div>;
}

function AccountPanel({ party, canManage }: { party: Party; canManage: boolean }) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ revision: number; data?: Data; error?: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const linksResponse = await fetch(`/api/parties/${encodeURIComponent(party.id)}/accounts`, { cache: "no-store", signal: controller.signal });
        const linksData = await linksResponse.json();
        if (!linksResponse.ok) throw new Error(linksData.error || "دریافت حساب‌های شخص انجام نشد.");
        let accounts: Account[] = [];
        if (canManage) {
          const accountsResponse = await fetch("/api/ledger-accounts", { cache: "no-store", signal: controller.signal });
          const accountsData = await accountsResponse.json();
          if (!accountsResponse.ok) throw new Error(accountsData.error || "دریافت فهرست حساب‌ها انجام نشد.");
          accounts = accountsData.accounts;
        }
        if (!controller.signal.aborted) setResult({ revision, data: { links: linksData.links, accounts } });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ revision, error: error instanceof Error ? error.message : "ارتباط با سرور برقرار نشد." });
      }
    }
    void load();
    return () => controller.abort();
  }, [party.id, canManage, revision]);

  async function save(purpose: Purpose, accountId: string | null) {
    setSaveError(""); setSuccess(""); setPending(true);
    try {
      const response = await fetch(`/api/parties/${encodeURIComponent(party.id)}/accounts`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ purpose, accountId }) });
      const body = await response.json();
      if (!response.ok) { setSaveError(body.error || "ذخیره اتصال انجام نشد."); return; }
      setSuccess(body.changed ? "اتصال حساب ذخیره شد." : "تغییری در اتصال ثبت نشد.");
      setRevision((value) => value + 1);
    } catch { setSaveError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setPending(false); }
  }

  const current = result?.revision === revision ? result : null;
  return <div className="mt-4 space-y-4 rounded-xl bg-slate-50 p-4">
    <p className="text-xs leading-6 text-slate-600">حساب دریافتنی برای مشتری و حساب پرداختنی برای تأمین‌کننده است. مانده اشخاص هنوز در این صفحه محاسبه نمی‌شود.</p>
    {!canManage && <p className="text-xs text-slate-500">تغییر اتصال فقط برای مدیر سازمان مجاز است.</p>}
    {success && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
    {saveError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{saveError}</p>}
    {!current ? <p role="status" className="text-sm text-slate-600">در حال دریافت حساب‌ها…</p> : current.error ? <p role="alert" className="text-sm text-red-700">{current.error} <button type="button" className="font-semibold underline" onClick={() => setRevision((value) => value + 1)}>تلاش دوباره</button></p> : current.data && <>
      {canManage && <p className="text-xs leading-6 text-slate-500">حساب باید فعال، بدون زیرحساب، بدون گردش قبلی و اختصاص‌نیافته باشد. انتخاب حساب مناسب را بررسی کنید؛ اعتبار نهایی هنگام ذخیره کنترل می‌شود.</p>}
      {(["RECEIVABLE", "PAYABLE"] as const).map((purpose) => {
        const link = current.data!.links.find((item) => item.purpose === purpose);
        const roleAvailable = purpose === "RECEIVABLE" ? party.isCustomer : party.isSupplier;
        if (!roleAvailable && !link) return null;
        return <AccountPurpose key={`${purpose}:${revision}`} purpose={purpose} link={link} accounts={current.data!.accounts} canManage={canManage} partyActive={party.isActive} pending={pending} onSave={save} />;
      })}
    </>}
  </div>;
}

function AccountPurpose({ purpose, link, accounts, canManage, partyActive, pending, onSave }: { purpose: Purpose; link?: Link; accounts: Account[]; canManage: boolean; partyActive: boolean; pending: boolean; onSave: (purpose: Purpose, accountId: string | null) => Promise<void> }) {
  const [selected, setSelected] = useState(link?.account.id ?? "");
  const [confirming, setConfirming] = useState(false);
  const label = purpose === "RECEIVABLE" ? "حساب دریافتنی" : "حساب پرداختنی";
  const neededType = purpose === "RECEIVABLE" ? "ASSET" : "LIABILITY";
  const parentIds = new Set(accounts.map((account) => account.parentId).filter(Boolean));
  const available = accounts.filter((account) => account.type === neededType && account.isActive && !parentIds.has(account.id));
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (selected) void onSave(purpose, selected); }
  return <section className="rounded-lg border border-slate-200 bg-white p-4"><h4 className="text-sm font-bold text-slate-900">{label}</h4>
    <p className="mt-2 break-words text-sm text-slate-600">{link ? <><bdi>{link.account.code}</bdi> — {link.account.name}</> : "حسابی متصل نشده است."}</p>
    {link?.firstUsedAt && <p className="mt-2 text-xs leading-6 text-amber-800">این حساب در سند استفاده شده و اتصال آن قابل تغییر یا قطع نیست.</p>}
    {canManage && !link?.firstUsedAt && <>
      {!partyActive && <p className="mt-2 text-xs text-slate-600">برای اتصال یا تعویض، ابتدا شخص را فعال کنید.</p>}
      <form onSubmit={submit} className="mt-3 space-y-3"><label className="block text-sm font-medium">انتخاب {label}<select value={selected} onChange={(event) => setSelected(event.target.value)} disabled={pending || !partyActive} className={selectClass}><option value="">انتخاب حساب</option>{link && !available.some((account) => account.id === link.account.id) && <option value={link.account.id}>{link.account.code} — {link.account.name}</option>}{available.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}</select></label>
        {available.length === 0 && <p className="text-xs leading-6 text-slate-500">حساب فعال بدون زیرحساب از نوع {neededType === "ASSET" ? "دارایی" : "بدهی"} پیدا نشد؛ می‌توانید ابتدا آن را در کدینگ تعریف کنید.</p>}
        <div className="flex flex-wrap gap-2"><button disabled={pending || !partyActive || !selected || selected === link?.account.id} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "در حال ذخیره…" : link ? "تغییر حساب" : "اتصال حساب"}</button>{link && !confirming && <button type="button" disabled={pending} className={secondary} onClick={() => setConfirming(true)}>قطع اتصال</button>}</div>
      </form>
      {confirming && <div className="mt-3 rounded-lg bg-amber-50 p-3"><p className="text-sm leading-6 text-amber-950">اتصال {label} قطع شود؟</p><div className="mt-2 flex gap-2"><button type="button" disabled={pending} onClick={() => void onSave(purpose, null)} className="rounded-lg bg-amber-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">تأیید قطع اتصال</button><button type="button" disabled={pending} onClick={() => setConfirming(false)} className={secondary}>انصراف</button></div></div>}
    </>}
  </section>;
}
