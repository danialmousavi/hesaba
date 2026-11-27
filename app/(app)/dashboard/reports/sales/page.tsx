import { readOrganizationPage } from "@/lib/organization-page";
import Link from "next/link";
import { SalesReport } from "./sales-report";

export const instant = false;

export default async function SalesPage() {
  const { member, data: [years, customers] } = await readOrganizationPage((tx, member) => Promise.all([
    tx.fiscalYear.findMany({ where: { organizationId: member.organizationId }, orderBy: { startDate: "desc" }, select: { id: true, name: true, status: true, startDate: true, endDate: true } }),
    tx.party.findMany({ where: { organizationId: member.organizationId, isCustomer: true }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, isActive: true } }),
  ]));
  return <section><p className="text-sm font-semibold text-emerald-700">گزارش‌ها · {member.organization.name}</p><h1 className="mt-3 font-modam text-3xl font-bold">گزارش فروش و مطالبات</h1><p className="mt-3 text-sm leading-7 text-slate-600">فاکتورهای فروش و وضعیت دریافت آن‌ها را در تاریخ انتخابی بررسی کنید.</p>{years.length === 0 ? <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-sm">هنوز سال مالی ایجاد نشده است. <Link href="/dashboard/fiscal-years" className="font-semibold text-emerald-700 underline">مدیریت سال مالی</Link></p> : <SalesReport years={years.map((year) => ({ ...year, startDate: year.startDate.toISOString().slice(0, 10), endDate: year.endDate.toISOString().slice(0, 10) }))} customers={customers} />}</section>;
}
