import { readOrganizationPage } from "@/lib/organization-page";
import Link from "next/link";
import { DashboardSummary } from "./dashboard-summary";

export const instant = false;

export default async function DashboardPage() {
  const { member: membership, data: [years, cashAccounts] } = await readOrganizationPage((tx, membership) => Promise.all([
    tx.fiscalYear.findMany({ where: { organizationId: membership.organizationId }, orderBy: { startDate: "desc" }, select: { id: true, name: true, status: true, startDate: true, endDate: true } }),
    tx.ledgerAccount.findMany({ where: { organizationId: membership.organizationId, type: "ASSET", children: { none: {} }, partyLinks: { none: {} } }, orderBy: [{ code: "asc" }, { id: "asc" }], select: { id: true, code: true, name: true, isActive: true } }),
  ]));
  return <section className="w-full">
    <p className="text-sm font-semibold text-emerald-700">نمای کلی · {membership.organization.name}</p>
    <h1 className="mt-3 font-modam text-3xl font-bold text-slate-900">خوش آمدید، {membership.userName}</h1>
    <p className="mt-3 text-sm leading-7 text-slate-600">وضعیت مالی و آخرین فعالیت‌های سازمان را در یک نگاه ببینید.</p>
    {years.length === 0 ? <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600">برای مشاهده خلاصه مالی، ابتدا سال مالی ایجاد کنید. <Link href="/dashboard/fiscal-years" className="font-semibold text-emerald-700 underline underline-offset-4">مدیریت سال مالی</Link></div> : <DashboardSummary years={years.map((year) => ({ ...year, startDate: year.startDate.toISOString().slice(0, 10), endDate: year.endDate.toISOString().slice(0, 10) }))} cashAccounts={cashAccounts} />}
  </section>;
}
