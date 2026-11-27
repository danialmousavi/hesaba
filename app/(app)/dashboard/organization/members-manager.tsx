"use client";

import { useEffect, useState, type FormEvent } from "react";
import { organizationFetch as fetch } from "@/lib/organization-fetch";

type Role = "ADMIN" | "ACCOUNTANT" | "VIEWER";
type Member = { id: string; userId: string; role: Role; createdAt: string; user: { name: string; email: string } };
const roles: Record<Role, string> = { ADMIN: "مدیر", ACCOUNTANT: "حسابدار", VIEWER: "مشاهده‌گر" };
const input = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const primary = "rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60";
const secondary = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60";

export function MembersManager({ currentUserId }: { currentUserId: string }) {
  const [result, setResult] = useState<{ members: Member[] } | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [removing, setRemoving] = useState<Member | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const response = await fetch("/api/organization/members", { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "دریافت فهرست اعضا انجام نشد.");
        if (!controller.signal.aborted) { setResult(data); setError(""); }
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "ارتباط با سرور برقرار نشد.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [revision]);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget, data = new FormData(form);
    setError(""); setMessage(""); setPending("add");
    try {
      const response = await fetch("/api/organization/members", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: data.get("email"), role: data.get("role") }) });
      const body = await response.json();
      if (!response.ok) { setError(body.error || "افزودن عضو انجام نشد."); return; }
      form.reset(); setMessage(`«${body.member.user.name}» به سازمان اضافه شد.`); setRevision((value) => value + 1);
    } catch { setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setPending(null); }
  }

  async function changeRole(member: Member, role: Role) {
    if (role === member.role) return;
    setError(""); setMessage(""); setPending(`role:${member.id}`);
    try {
      const response = await fetch(`/api/organization/members/${encodeURIComponent(member.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ role }) });
      const body = await response.json();
      if (!response.ok) { setError(body.error || "تغییر نقش انجام نشد."); return; }
      setMessage(body.unchanged ? "نقش عضو تغییری نکرد." : `نقش «${body.member.user.name}» ذخیره شد.`); setRevision((value) => value + 1);
    } catch { setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setPending(null); }
  }

  async function remove() {
    if (!removing) return;
    setError(""); setMessage(""); setPending(`remove:${removing.id}`);
    try {
      const response = await fetch(`/api/organization/members/${encodeURIComponent(removing.id)}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) { setError(body.error || "حذف دسترسی انجام نشد."); return; }
      setMessage(`دسترسی «${removing.user.name}» حذف شد.`); setRemoving(null); setRevision((value) => value + 1);
    } catch { setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setPending(null); }
  }

  return <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
    <div><p className="text-sm font-medium text-emerald-700">مدیریت دسترسی</p><h2 className="mt-2 font-modam text-2xl font-bold">اعضای سازمان</h2><p className="mt-2 text-sm leading-7 text-slate-600">فقط حساب‌هایی که پیش‌تر ثبت‌نام کرده‌اند با ایمیل به سازمان افزوده می‌شوند.</p></div>
    <form onSubmit={add} className="mt-6 grid items-end gap-4 rounded-xl bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_180px_auto]">
      <label className="block text-sm font-medium">ایمیل عضو<input name="email" type="email" required maxLength={320} dir="ltr" placeholder="name@example.com" className={input} /></label>
      <label className="block text-sm font-medium">نقش<select name="role" defaultValue="VIEWER" className={input}>{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button disabled={pending !== null} className={primary}>{pending === "add" ? "در حال افزودن…" : "افزودن عضو"}</button>
    </form>
    {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error} <button type="button" className="font-semibold underline" onClick={() => setRevision((value) => value + 1)}>تلاش دوباره</button></p>}
    {message && <p role="status" className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {loading ? <p role="status" className="mt-6 text-sm text-slate-600">در حال دریافت فهرست اعضا…</p> : result && <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[620px] text-right text-sm"><thead className="border-b border-slate-200 text-slate-500"><tr><th className="px-3 py-3 font-medium">عضو</th><th className="px-3 py-3 font-medium">ایمیل</th><th className="px-3 py-3 font-medium">نقش</th><th className="px-3 py-3 font-medium">عملیات</th></tr></thead><tbody>{result.members.map((member) => <tr key={member.id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-4 font-semibold text-slate-900">{member.user.name}{member.userId === currentUserId && <span className="mr-2 text-xs font-normal text-slate-500">(شما)</span>}</td><td className="px-3 py-4" dir="ltr">{member.user.email}</td><td className="px-3 py-4"><select aria-label={`نقش ${member.user.name}`} value={member.role} disabled={pending !== null} onChange={(event) => void changeRole(member, event.target.value as Role)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td className="px-3 py-4"><button type="button" disabled={pending !== null} onClick={() => setRemoving(member)} className="text-sm font-semibold text-red-700 underline underline-offset-4 disabled:opacity-50">حذف دسترسی</button></td></tr>)}</tbody></table></div>}
    {removing && <div role="alertdialog" aria-modal="true" aria-labelledby="remove-member-title" aria-describedby="remove-member-description" className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-5"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><h3 id="remove-member-title" className="font-modam text-xl font-bold">حذف دسترسی عضو</h3><p id="remove-member-description" className="mt-3 text-sm leading-7 text-slate-600">دسترسی «{removing.user.name}» به این سازمان حذف می‌شود. اطلاعات مالی سازمان حذف نمی‌شوند.</p><div className="mt-5 flex flex-wrap gap-2"><button type="button" disabled={pending !== null} onClick={() => void remove()} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending === `remove:${removing.id}` ? "در حال حذف…" : "حذف دسترسی"}</button><button type="button" disabled={pending !== null} onClick={() => setRemoving(null)} className={secondary}>انصراف</button></div></div></div>}
  </section>;
}
