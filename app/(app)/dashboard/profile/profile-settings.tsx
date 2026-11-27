"use client";

import { useEffect, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

type Profile = { id: string; name: string; email: string; emailVerified: boolean; createdAt: string };
const input = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const button = "rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60";

export function ProfileSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState("");
  const [profilePending, setProfilePending] = useState(false);
  const [passwordPending, setPasswordPending] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [message, setMessage] = useState("");

  async function loadProfile() {
    setLoadError("");
    try {
      const response = await window.fetch("/api/profile", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "دریافت پروفایل انجام نشد.");
      setProfile(body.profile);
    } catch (error) { setLoadError(error instanceof Error ? error.message : "ارتباط با سرور برقرار نشد."); }
  }

  useEffect(() => { void loadProfile(); }, []);

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (!name) { setProfileError("نام را وارد کنید."); return; }
    setProfileError(""); setMessage(""); setProfilePending(true);
    try {
      const { error } = await authClient.updateUser({ name });
      if (error) { setProfileError(error.message || "ویرایش پروفایل انجام نشد."); return; }
      await loadProfile(); setMessage("نام پروفایل ذخیره شد.");
    } catch { setProfileError("ارتباط با سرویس پروفایل برقرار نشد. دوباره تلاش کنید."); }
    finally { setProfilePending(false); }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget, data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") ?? ""), newPassword = String(data.get("newPassword") ?? ""), confirmation = String(data.get("confirmation") ?? "");
    if (newPassword.length < 8) { setPasswordError("رمز جدید باید دست‌کم ۸ کاراکتر باشد."); return; }
    if (newPassword !== confirmation) { setPasswordError("تکرار رمز جدید با رمز جدید یکسان نیست."); return; }
    setPasswordError(""); setMessage(""); setPasswordPending(true);
    try {
      const { error } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: data.has("revokeOtherSessions") });
      if (error) { setPasswordError(error.message || "تغییر رمز انجام نشد."); return; }
      form.reset(); setMessage("رمز عبور با موفقیت تغییر کرد.");
    } catch { setPasswordError("ارتباط با سرویس تغییر رمز برقرار نشد. دوباره تلاش کنید."); }
    finally { setPasswordPending(false); }
  }

  if (!profile && !loadError) return <p role="status" className="mt-8 text-sm text-slate-600">در حال دریافت پروفایل…</p>;
  if (loadError) return <p role="alert" className="mt-8 rounded-xl bg-red-50 p-4 text-sm text-red-700">{loadError} <button type="button" onClick={() => void loadProfile()} className="font-semibold underline">تلاش دوباره</button></p>;
  if (!profile) return null;
  return <div className="mt-8 grid items-start gap-6 xl:grid-cols-2">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="font-modam text-xl font-bold">اطلاعات پروفایل</h2><p className="mt-2 text-sm leading-7 text-slate-600">ایمیل برای ورود استفاده می‌شود و در این بخش قابل تغییر نیست.</p><form onSubmit={updateProfile} className="mt-5 space-y-4"><label className="block text-sm font-medium">نام<input name="name" required maxLength={150} defaultValue={profile.name} className={input} /></label><label className="block text-sm font-medium">ایمیل<input value={profile.email} readOnly dir="ltr" className={`${input} cursor-not-allowed bg-slate-50 text-slate-500`} /></label>{profileError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{profileError}</p>}<button disabled={profilePending} className={button}>{profilePending ? "در حال ذخیره…" : "ذخیره نام"}</button></form></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="font-modam text-xl font-bold">تغییر رمز عبور</h2><p className="mt-2 text-sm leading-7 text-slate-600">برای تغییر رمز، رمز فعلی و رمز جدید را وارد کنید.</p><form onSubmit={changePassword} className="mt-5 space-y-4"><label className="block text-sm font-medium">رمز فعلی<input name="currentPassword" type="password" required autoComplete="current-password" className={input} /></label><label className="block text-sm font-medium">رمز جدید<input name="newPassword" type="password" required minLength={8} autoComplete="new-password" className={input} /></label><label className="block text-sm font-medium">تکرار رمز جدید<input name="confirmation" type="password" required minLength={8} autoComplete="new-password" className={input} /></label><label className="flex items-start gap-2 text-sm leading-6 text-slate-700"><input name="revokeOtherSessions" type="checkbox" defaultChecked className="mt-1 accent-emerald-700" />از تمام نشست‌های دیگر خارج شوم</label>{passwordError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{passwordError}</p>}<button disabled={passwordPending} className={button}>{passwordPending ? "در حال تغییر…" : "تغییر رمز عبور"}</button></form></section>
    {message && <p role="status" className="xl:col-span-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
  </div>;
}
