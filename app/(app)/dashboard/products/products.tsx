"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ProductControls } from "./product-controls";
import { normalizeDigits, validPrice, type Product } from "./product-types";

type Result = { products: Product[]; total: number; page: number; pageSize: number };
type Filters = { search: string; type: string; status: string; page: number };
const initial: Filters = { search: "", type: "all", status: "all", page: 1 };
const input = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const button = "rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60";
const format = (value: string) => BigInt(value).toLocaleString("fa-IR");

export function Products({ canCreate }: { canCreate: boolean }) {
  const [filters, setFilters] = useState<Filters>(initial);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: Result; error?: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const query = new URLSearchParams({ search: filters.search, type: filters.type, status: filters.status, page: String(filters.page) }).toString();
  const key = `${query}:${revision}`;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/products?${query}`, { cache: "no-store", signal: controller.signal });
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
    const salePrice = normalizeDigits(String(data.get("salePrice") ?? ""));
    const purchasePrice = normalizeDigits(String(data.get("purchasePrice") ?? ""));
    setFormError(""); setSuccess("");
    if (!validPrice(salePrice) || (purchasePrice && !validPrice(purchasePrice))) { setFormError("قیمت‌ها باید عدد صحیح نامنفی، بدون جداکننده و حداکثر ۲۰ رقم باشند."); return; }
    setPending(true);
    try {
      const response = await fetch("/api/products", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: data.get("code"), name: data.get("name"), type: data.get("type"), unit: data.get("unit"), salePrice, purchasePrice: purchasePrice || null, description: data.get("description") }) });
      const body = await response.json();
      if (!response.ok) { setFormError(body.error || "ثبت کالا یا خدمت انجام نشد."); return; }
      form.reset(); setSuccess(`«${body.product.name}» با موفقیت ثبت شد.`);
      setSearch(""); setType("all"); setStatus("all"); setFilters(initial); setRevision((value) => value + 1);
    } catch { setFormError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setPending(false); }
  }

  const current = result?.key === key ? result : null;
  return <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-modam text-xl font-bold">ثبت کالا یا خدمت</h2>
      {!canCreate ? <p className="mt-4 text-sm leading-7 text-slate-600">نقش مشاهده‌گر امکان ثبت کالا یا خدمت را ندارد.</p> : <form onSubmit={create} className="mt-5 space-y-4">
        <label className="block text-sm font-medium">نام <span className="text-red-700">*</span><input name="name" required maxLength={150} className={input} /></label>
        <label className="block text-sm font-medium">کد <span className="text-red-700">*</span><input name="code" required maxLength={50} className={input} /><span className="mt-1 block text-xs text-slate-500">کد باید در سازمان یکتا باشد.</span></label>
        <label className="block text-sm font-medium">نوع<select name="type" className={input}><option value="GOODS">کالا</option><option value="SERVICE">خدمت</option></select></label>
        <label className="block text-sm font-medium">واحد <span className="text-red-700">*</span><input name="unit" required maxLength={50} placeholder="مثلاً عدد یا ساعت" className={input} /></label>
        <label className="block text-sm font-medium">قیمت فروش (ریال) <span className="text-red-700">*</span><input name="salePrice" required inputMode="numeric" maxLength={20} dir="ltr" aria-describedby="price-hint" className={input} /></label>
        <label className="block text-sm font-medium">قیمت خرید (ریال) <span className="font-normal text-slate-500">(اختیاری)</span><input name="purchasePrice" inputMode="numeric" maxLength={20} dir="ltr" aria-describedby="price-hint" className={input} /></label>
        <p id="price-hint" className="text-xs leading-6 text-slate-500">قیمت را به ریال، بدون اعشار و جداکننده وارد کنید؛ صفر مجاز است.</p>
        <label className="block text-sm font-medium">توضیحات <span className="font-normal text-slate-500">(اختیاری)</span><textarea name="description" rows={3} maxLength={1000} className={input} /></label>
        {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
        {success && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
        <button disabled={pending} className={button}>{pending ? "در حال ثبت…" : "ثبت کالا یا خدمت"}</button>
      </form>}
    </section>
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-modam text-xl font-bold">فهرست کالا و خدمات</h2>
      <form onSubmit={(event) => { event.preventDefault(); setFilters({ search: search.trim(), type, status, page: 1 }); }} className="mt-5 grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="block text-sm font-medium sm:col-span-2 xl:col-span-1">جست‌وجو<input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={150} placeholder="نام یا کد" className={input} /></label>
        <label className="block text-sm font-medium">نوع<select value={type} onChange={(event) => setType(event.target.value)} className={input}><option value="all">همه انواع</option><option value="goods">کالا</option><option value="service">خدمت</option></select></label>
        <label className="block text-sm font-medium">وضعیت<select value={status} onChange={(event) => setStatus(event.target.value)} className={input}><option value="all">همه وضعیت‌ها</option><option value="active">فعال</option><option value="inactive">غیرفعال</option></select></label>
        <button className={button}>جست‌وجو</button>
      </form>
      {updateMessage && <p role="status" className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{updateMessage}</p>}
      {!current ? <p role="status" className="mt-6 text-sm text-slate-600">در حال دریافت فهرست…</p> : current.error ? <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{current.error} <button type="button" onClick={() => setRevision((value) => value + 1)} className="font-semibold underline underline-offset-4">تلاش دوباره</button></p> : current.data && <ProductList data={current.data} canEdit={canCreate} onUpdated={(name) => { setUpdateMessage(`تغییرات «${name}» ذخیره شد. فهرست با فیلترهای فعلی نمایش داده می‌شود.`); setFilters((value) => ({ ...value, page: 1 })); setRevision((value) => value + 1); }} onPage={(page) => setFilters((value) => ({ ...value, page }))} />}
    </section>
  </div>;
}

function ProductList({ data, onPage, canEdit, onUpdated }: { data: Result; onPage: (page: number) => void; canEdit: boolean; onUpdated: (name: string) => void }) {
  return <div className="mt-6"><p className="text-sm text-slate-500">{data.total.toLocaleString("fa-IR")} مورد</p>
    {data.products.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">کالا یا خدمتی با این مشخصات پیدا نشد.</p> : <ul className="mt-4 space-y-3">{data.products.map((product) => <li key={product.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h3 className="break-words font-semibold text-slate-900">{product.name}</h3><p className="mt-1 break-all text-sm text-slate-500">کد: <bdi>{product.code}</bdi></p></div><span className={product.isActive ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"}>{product.isActive ? "فعال" : "غیرفعال"}</span></div><p className="mt-3 text-sm text-slate-600">{product.type === "GOODS" ? "کالا" : "خدمت"} · واحد: {product.unit}</p><dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">قیمت فروش</dt><dd className="mt-1 break-words font-semibold text-slate-800">{format(product.salePrice)} ریال</dd></div><div><dt className="text-slate-500">قیمت خرید</dt><dd className="mt-1 break-words font-semibold text-slate-800">{product.purchasePrice === null ? "ثبت نشده" : `${format(product.purchasePrice)} ریال`}</dd></div></dl>{product.description && <p className="mt-3 break-words text-sm leading-6 text-slate-500">{product.description}</p>}{canEdit && <ProductControls product={product} onUpdated={onUpdated} />}</li>)}</ul>}
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => onPage(data.page - 1)} disabled={data.page <= 1} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">صفحه قبل</button><span className="text-sm text-slate-600">صفحه {data.page.toLocaleString("fa-IR")} از {Math.max(1, Math.ceil(data.total / data.pageSize)).toLocaleString("fa-IR")}</span><button type="button" onClick={() => onPage(data.page + 1)} disabled={data.page * data.pageSize >= data.total} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">صفحه بعد</button></div>
  </div>;
}
