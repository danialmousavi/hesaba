import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SalesReport } from "./sales-report";

export const instant = false;

export default async function SalesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, organization: { select: { name: true } } } });
  if (!member) redirect("/onboarding");
  const [years, customers] = await Promise.all([
    prisma.fiscalYear.findMany({ where: { organizationId: member.organizationId }, orderBy: { startDate: "desc" }, select: { id: true, name: true, status: true, startDate: true, endDate: true } }),
    prisma.party.findMany({ where: { organizationId: member.organizationId, isCustomer: true }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, isActive: true } }),
  ]);
  return <section><p className="text-sm font-semibold text-emerald-700">گزارش‌ها · {member.organization.name}</p><h1 className="mt-3 font-modam text-3xl font-bold">گزارش فروش و مطالبات</h1><p className="mt-3 text-sm leading-7 text-slate-600">فاکتورهای فروش و وضعیت دریافت آن‌ها را در تاریخ انتخابی بررسی کنید.</p>{years.length === 0 ? <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-sm">هنوز سال مالی ایجاد نشده است. <Link href="/dashboard/fiscal-years" className="font-semibold text-emerald-700 underline">مدیریت سال مالی</Link></p> : <SalesReport years={years.map((year) => ({ ...year, startDate: year.startDate.toISOString().slice(0, 10), endDate: year.endDate.toISOString().slice(0, 10) }))} customers={customers} />}</section>;
}
