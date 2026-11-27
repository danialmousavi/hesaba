import { readOrganizationPage } from "@/lib/organization-page";
import Link from "next/link";
import { GeneralLedger } from "./general-ledger";

export const instant = false;

export default async function GeneralLedgerPage() {
  const { member, data: [years, accounts] } = await readOrganizationPage((tx, member) => Promise.all([
    tx.fiscalYear.findMany({ where: { organizationId: member.organizationId }, orderBy: { startDate: "desc" }, select: { id: true, name: true, status: true } }),
    tx.ledgerAccount.findMany({ where: { organizationId: member.organizationId }, orderBy: { code: "asc" }, select: { id: true, name: true, code: true, isActive: true } }),
  ]));
  return <section><p className="text-sm font-semibold text-emerald-700">گزارش‌ها · {member.organization.name}</p><h1 className="mt-3 font-modam text-3xl font-bold">دفتر کل</h1><p className="mt-3 text-sm leading-7 text-slate-600">گردش مستقیم حساب و ماندهٔ تجمعی آن از سندهای ثبت‌شده.</p>{years.length === 0 ? <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">ابتدا یک <Link href="/dashboard/fiscal-years" className="font-semibold text-emerald-700 underline">سال مالی</Link> ایجاد کنید.</div> : accounts.length === 0 ? <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">ابتدا یک <Link href="/dashboard/accounts" className="font-semibold text-emerald-700 underline">حساب</Link> ایجاد کنید.</div> : <GeneralLedger years={years} accounts={accounts} />}</section>;
}
