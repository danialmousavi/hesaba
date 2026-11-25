import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PartyBalances } from "./party-balances";

export const instant = false;

export default async function PartyBalancesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, organization: { select: { name: true } } } });
  if (!member) redirect("/onboarding");
  const years = await prisma.fiscalYear.findMany({ where: { organizationId: member.organizationId }, orderBy: { startDate: "desc" }, select: { id: true, name: true, status: true } });
  return <section><p className="text-sm font-semibold text-emerald-700">گزارش‌ها · {member.organization.name}</p><h1 className="mt-3 font-modam text-3xl font-bold">مانده اشخاص و فاکتورها</h1><p className="mt-3 text-sm leading-7 text-slate-600">گردش حساب‌های متصل به اشخاص و وضعیت فاکتورهای فروش را بررسی کنید.</p>
    {years.length === 0 ? <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600">هنوز سال مالی ایجاد نشده است. <Link href="/dashboard/fiscal-years" className="font-semibold text-emerald-700 underline">مدیریت سال مالی</Link></div> : <PartyBalances years={years} />}
  </section>;
}
