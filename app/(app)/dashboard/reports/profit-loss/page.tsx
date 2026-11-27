import { readOrganizationPage } from "@/lib/organization-page";
import Link from "next/link";
import { ProfitLoss } from "./profit-loss";

export const instant = false;

export default async function ProfitLossPage() {
  const { member, data: years } = await readOrganizationPage((tx, member) => tx.fiscalYear.findMany({ where: { organizationId: member.organizationId }, orderBy: { startDate: "desc" }, select: { id: true, name: true, status: true } }));
  return <section><p className="text-sm font-semibold text-emerald-700">گزارش‌ها · {member.organization.name}</p><h1 className="mt-3 font-modam text-3xl font-bold">سود و زیان</h1><p className="mt-3 text-sm leading-7 text-slate-600">خلاصهٔ درآمد و هزینه بر اساس اسناد ثبت‌نهایی‌شده در سال مالی.</p>{years.length === 0 ? <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600">هنوز سال مالی ایجاد نشده است. <Link href="/dashboard/fiscal-years" className="font-semibold text-emerald-700 underline">مدیریت سال مالی</Link></div> : <ProfitLoss years={years} />}</section>;
}
