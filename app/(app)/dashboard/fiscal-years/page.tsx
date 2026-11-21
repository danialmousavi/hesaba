import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FiscalYearForm } from "./year-form";
import { CloseYearButton } from "./close-year-button";

export const instant = false;

export default async function FiscalYearsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true, organization: { select: { name: true } } } });
  if (!member) redirect("/onboarding");
  const years = await prisma.fiscalYear.findMany({ where: { organizationId: member.organizationId }, orderBy: { startDate: "desc" } });
  const open = years.some((year) => year.status === "OPEN");
  const format = (date: Date) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "long", timeZone: "UTC" }).format(date);

  return <section>
    <p className="text-sm font-semibold text-emerald-700">تنظیمات مالی · {member.organization.name}</p>
    <h1 className="mt-3 font-modam text-3xl font-bold">سال‌های مالی</h1>
    <p className="mt-3 text-sm leading-7 text-slate-600">سال مالی، بازهٔ زمانی ثبت و گزارش عملیات حسابداری سازمان شماست.</p>
    <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-modam text-xl font-bold">فهرست سال‌های مالی</h2>
        {years.length === 0 ? <p className="mt-6 rounded-xl bg-slate-50 p-5 text-sm leading-7 text-slate-600">هنوز سال مالی ثبت نشده است.</p> : <div className="mt-5 space-y-3">{years.map((year) => <article key={year.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{year.name}</h3><span className={year.status === "OPEN" ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800" : "rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"}>{year.status === "OPEN" ? "باز" : "بسته"}</span></div><p className="mt-3 text-sm leading-7 text-slate-600">از {format(year.startDate)} تا {format(year.endDate)}</p>{year.status === "OPEN" && member.role === "ADMIN" && <CloseYearButton id={year.id} name={year.name} />}</article>)}</div>}
      </section>
      <section className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-modam text-xl font-bold">ایجاد سال مالی</h2>{member.role !== "ADMIN" ? <p className="mt-4 text-sm leading-7 text-slate-600">فقط مدیر سازمان می‌تواند سال مالی ایجاد کند.</p> : open ? <p className="mt-4 text-sm leading-7 text-slate-600">یک سال مالی باز وجود دارد. برای ایجاد سال جدید ابتدا سال فعلی را ببندید.</p> : <FiscalYearForm />}</section>
    </div>
  </section>;
}
