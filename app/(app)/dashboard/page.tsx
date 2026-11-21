import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardSummary } from "./dashboard-summary";

export const instant = false;

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id }, orderBy: { createdAt: "asc" },
    select: { organizationId: true, organization: { select: { name: true } } },
  });
  if (!membership) redirect("/onboarding");
  const years = await prisma.fiscalYear.findMany({
    where: { organizationId: membership.organizationId }, orderBy: { startDate: "desc" },
    select: { id: true, name: true, status: true },
  });
  return <section className="w-full">
    <p className="text-sm font-semibold text-emerald-700">نمای کلی · {membership.organization.name}</p>
    <h1 className="mt-3 font-modam text-3xl font-bold text-slate-900">خوش آمدید، {session.user.name}</h1>
    <p className="mt-3 text-sm leading-7 text-slate-600">وضعیت مالی و آخرین فعالیت‌های سازمان را در یک نگاه ببینید.</p>
    {years.length === 0 ? <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600">برای مشاهده خلاصه مالی، ابتدا سال مالی ایجاد کنید. <Link href="/dashboard/fiscal-years" className="font-semibold text-emerald-700 underline underline-offset-4">مدیریت سال مالی</Link></div> : <DashboardSummary years={years} />}
  </section>;
}
