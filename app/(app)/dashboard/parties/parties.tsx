"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PartyControls } from "./party-controls";
import { PartyAccounts } from "./party-accounts";

type Party = { id: string; name: string; isCustomer: boolean; isSupplier: boolean; isActive: boolean; phone: string | null; email: string | null; address: string | null };
type Result = { parties: Party[]; total: number; page: number; pageSize: number };
type Filters = { search: string; role: string; status: string; page: number };
const initialFilters: Filters = { search: "", role: "all", status: "all", page: 1 };
const input = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const button = "rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60";

export function Parties({ canCreate, canManageAccounts }: { canCreate: boolean; canManageAccounts: boolean }) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: Result; error?: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const query = new URLSearchParams({ search: filters.search, role: filters.role, status: filters.status, page: String(filters.page) }).toString();
  const key = `${query}:${revision}`;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/parties?${query}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "دریافت فهرست انجام نشد.");
        if (!controller.signal.aborted) setResult({ key, data });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ key, error: error instanceof Error ? error.message : "ارتباط با سرور برقرار نشد." });
      }
    }
    void load();
    return () => controller.abort();
  }, [query, key]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const isCustomer = data.has("isCustomer"), isSupplier = data.has("isSupplier");
    setFormError(""); setSuccess("");
    if (!isCustomer && !isSupplier) { setFormError("حداقل یک نقش برای شخص انتخاب کنید."); return; }
    setPending(true);
    try {
      const response = await fetch("/api/parties", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: data.get("name"), isCustomer, isSupplier, phone: data.get("phone"), email: data.get("email"), address: data.get("address") }) });
      const body = await response.json();
      if (!response.ok) { setFormError(body.error || "ثبت شخص انجام نشد."); return; }
      form.reset(); setSuccess(`«${body.party.name}» با موفقیت ثبت شد.`);
      setSearch(""); setRole("all"); setStatus("all"); setFilters(initialFilters); setRevision((value) => value + 1);
    } catch { setFormError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setPending(false); }
  }

  const current = result?.key === key ? result : null;
  return <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-modam text-xl font-bold">ثبت شخص جدید</h2>
      {!canCreate ? <p className="mt-4 text-sm leading-7 text-slate-600">نقش مشاهده‌گر امکان ثبت شخص را ندارد.</p> : <form onSubmit={create} className="mt-5 space-y-4">
        <label className="block text-sm font-medium">نام شخص <span className="text-red-700">*</span><input name="name" required maxLength={150} className={input} /></label>
        <fieldset><legend className="text-sm font-medium">نقش شخص <span className="text-red-700">*</span></legend><div className="mt-3 flex flex-wrap gap-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" name="isCustomer" defaultChecked className="accent-emerald-700" />مشتری</label><label className="flex items-center gap-2"><input type="checkbox" name="isSupplier" className="accent-emerald-700" />تأمین‌کننده</label></div></fieldset>
        <label className="block text-sm font-medium">شماره تماس <span className="font-normal text-slate-500">(اختیاری)</span><input name="phone" type="tel" maxLength={40} dir="ltr" className={input} /></label>
        <label className="block text-sm font-medium">ایمیل <span className="font-normal text-slate-500">(اختیاری)</span><input name="email" type="email" dir="ltr" className={input} /></label>
        <label className="block text-sm font-medium">آدرس <span className="font-normal text-slate-500">(اختیاری)</span><textarea name="address" rows={3} maxLength={1000} className={input} /></label>
        {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
        {success && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
        <button disabled={pending} className={button}>{pending ? "در حال ثبت…" : "ثبت شخص"}</button>
      </form>}
    </section>
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-modam text-xl font-bold">فهرست اشخاص</h2>
      <form onSubmit={(event) => { event.preventDefault(); setFilters({ search: search.trim(), role, status, page: 1 }); }} className="mt-5 grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="block text-sm font-medium sm:col-span-2 xl:col-span-1">جست‌وجو<input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={150} placeholder="نام، تلفن یا ایمیل" className={input} /></label>
        <label className="block text-sm font-medium">نقش<select value={role} onChange={(event) => setRole(event.target.value)} className={input}><option value="all">همه نقش‌ها</option><option value="customer">مشتری</option><option value="supplier">تأمین‌کننده</option></select></label>
        <label className="block text-sm font-medium">وضعیت<select value={status} onChange={(event) => setStatus(event.target.value)} className={input}><option value="all">همه وضعیت‌ها</option><option value="active">فعال</option><option value="inactive">غیرفعال</option></select></label>
        <button className={button}>جست‌وجو</button>
      </form>
      {updateMessage && <p role="status" className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{updateMessage}</p>}
      {!current ? <p role="status" className="mt-6 text-sm text-slate-600">در حال دریافت فهرست…</p> : current.error ? <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{current.error} <button type="button" onClick={() => setRevision((value) => value + 1)} className="font-semibold underline underline-offset-4">تلاش دوباره</button></p> : current.data && <PartyList data={current.data} canEdit={canCreate} canManageAccounts={canManageAccounts} onUpdated={(name) => { setUpdateMessage(`تغییرات «${name}» ذخیره شد. فهرست بر اساس فیلترهای فعلی نمایش داده می‌شود.`); setFilters((value) => ({ ...value, page: 1 })); setRevision((value) => value + 1); }} onPage={(page) => setFilters((value) => ({ ...value, page }))} />}
    </section>
  </div>;
}

function PartyList({ data, onPage, canEdit, canManageAccounts, onUpdated }: { data: Result; onPage: (page: number) => void; canEdit: boolean; canManageAccounts: boolean; onUpdated: (name: string) => void }) {
  return <div className="mt-6"><p className="text-sm text-slate-500">{data.total.toLocaleString("fa-IR")} شخص</p>
    {data.parties.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">شخصی با این مشخصات پیدا نشد.</p> : <ul className="mt-4 space-y-3">{data.parties.map((party) => <li key={party.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold text-slate-900">{party.name}</h3><span className={party.isActive ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"}>{party.isActive ? "فعال" : "غیرفعال"}</span></div><p className="mt-2 text-sm text-slate-600">{[party.isCustomer && "مشتری", party.isSupplier && "تأمین‌کننده"].filter(Boolean).join(" · ")}</p><div className="mt-3 space-y-1 break-words text-sm text-slate-500">{party.phone && <p>تلفن: <span dir="ltr" className="inline-block">{party.phone}</span></p>}{party.email && <p>ایمیل: <span dir="ltr" className="inline-block">{party.email}</span></p>}{party.address && <p>آدرس: {party.address}</p>}</div>{canEdit && <PartyControls party={party} onUpdated={onUpdated} />}<PartyAccounts party={party} canManage={canManageAccounts} /></li>)}</ul>}
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => onPage(data.page - 1)} disabled={data.page <= 1} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">صفحه قبل</button><span className="text-sm text-slate-600">صفحه {data.page.toLocaleString("fa-IR")} از {Math.max(1, Math.ceil(data.total / data.pageSize)).toLocaleString("fa-IR")}</span><button type="button" onClick={() => onPage(data.page + 1)} disabled={data.page * data.pageSize >= data.total} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">صفحه بعد</button></div>
  </div>;
}
