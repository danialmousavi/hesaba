import Link from "next/link";
import { SignOutButton } from "./sign-out-button";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
      <div className="flex min-h-screen w-full flex-col md:flex-row">
        <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-l">
          <div className="px-6 py-6">
            <Link href="/dashboard" className="font-modam text-2xl font-bold text-emerald-800">حسابا</Link>
            <p className="mt-1 text-xs text-slate-500">فضای کار حسابداری شما</p>
          </div>
          <nav aria-label="منوی اصلی" className="flex gap-2 overflow-x-auto px-4 pb-4 md:flex-col">
            <Link href="/dashboard" className="whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800">نمای کلی</Link>
            <Link href="/dashboard/organization" className="whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800">سازمان من</Link>
            <Link href="/dashboard/fiscal-years" className="whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800">سال مالی</Link>
            <Link href="/dashboard/accounts" className="whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800">کدینگ حساب‌ها</Link>
          </nav>
          <div className="hidden px-8 pt-5 text-xs leading-6 text-slate-400 md:block">بخش‌های حسابداری به‌تدریج به این منو اضافه می‌شوند.</div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="flex min-h-20 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
            <div><p className="text-xs text-slate-500">فضای کاری</p><p className="mt-1 font-modam text-lg font-bold">حسابا</p></div>
            <SignOutButton />
          </header>
          <main className="w-full px-5 py-8 sm:px-8 sm:py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
