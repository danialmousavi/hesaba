import { ProfileSettings } from "./profile-settings";

export const instant = false;

export default function ProfilePage() {
  return <section><p className="text-sm font-medium text-emerald-700">حساب کاربری</p><h1 className="mt-3 font-modam text-3xl font-bold">پروفایل و امنیت</h1><p className="mt-3 text-sm leading-7 text-slate-600">نام نمایشی و رمز عبور حساب خود را مدیریت کنید.</p><ProfileSettings /></section>;
}
