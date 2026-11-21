import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GeneralLedger } from "./general-ledger";

export const instant = false;

export default async function GeneralLedgerPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, organization: { select: { name: true } } } });
  if (!member) redirect("/onboarding");
  const [years, accounts] = await Promise.all([
    prisma.fiscalYear.findMany({ where: { organizationId: member.organizationId }, orderBy: { startDate: "desc" }, select: { id: true, name: true, status: true } }),
    prisma.ledgerAccount.findMany({ where: { organizationId: member.organizationId }, orderBy: { code: "asc" }, select: { id: true, name: true, code: true, isActive: true } }),
  ]);
  return <section><p className="text-sm font-semibold text-emerald-700">گزارش‌ها · {member.organization.name}</p><h1 className="mt-3 font-modam text-3xl font-bold">دفتر کل</h1><p className="mt-3 text-sm leading-7 text-slate-600">گردش مستقیم حساب و ماندهٔ تجمعی آن از سندهای ثبت‌شده.</p>{years.length === 0 ? <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">ابتدا یک <Link href="/dashboard/fiscal-years" className="font-semibold text-emerald-700 underline">سال مالی</Link> ایجاد کنید.</div> : accounts.length === 0 ? <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">ابتدا یک <Link href="/dashboard/accounts" className="font-semibold text-emerald-700 underline">حساب</Link> ایجاد کنید.</div> : <GeneralLedger years={years} accounts={accounts} />}</section>;
}
