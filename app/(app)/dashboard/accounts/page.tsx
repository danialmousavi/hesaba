import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountForm } from "./account-form";
import { AccountControls } from "./account-controls";

export const instant = false;
const labels = { ASSET: "دارایی", LIABILITY: "بدهی", EQUITY: "سرمایه", REVENUE: "درآمد", EXPENSE: "هزینه" } as const;

export default async function AccountsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true, organization: { select: { name: true } } } });
  if (!member) redirect("/onboarding");
  const accounts = await prisma.ledgerAccount.findMany({ where: { organizationId: member.organizationId }, orderBy: { code: "asc" }, select: { id: true, parentId: true, code: true, name: true, type: true, isActive: true } });
  const renderTree = (parentId: string | null, visited: Set<string>): React.ReactNode => {
    const children = accounts.filter((account) => account.parentId === parentId && !visited.has(account.id));
    if (!children.length) return null;
    return <ul className={parentId ? "mt-3 space-y-3 border-r border-slate-200 pr-4" : "space-y-3"}>{children.map((account) => <li key={account.id}><div className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><span dir="ltr" className="ml-3 text-sm text-slate-500">{account.code}</span><span className="font-semibold">{account.name}</span></div><span className="text-sm text-slate-600">{labels[account.type]} · {account.isActive ? "فعال" : "غیرفعال"}</span></div>{member.role === "ADMIN" && <AccountControls account={account} />}</div>{renderTree(account.id, new Set([...visited, account.id]))}</li>)}</ul>;
  };
  return <section><p className="text-sm font-semibold text-emerald-700">حسابداری · {member.organization.name}</p><h1 className="mt-3 font-modam text-3xl font-bold">کدینگ حساب‌ها</h1><p className="mt-3 text-sm leading-7 text-slate-600">حساب‌های سازمان و زیرحساب‌های آن‌ها را مشاهده کنید.</p><div className="mt-8 grid gap-6 xl:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]"><section className="xl:col-start-2 xl:row-start-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-modam text-xl font-bold">درخت حساب‌ها</h2><div className="mt-5">{accounts.length ? renderTree(null, new Set()) : <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">هنوز حسابی ایجاد نشده است.</p>}</div></section><section className="xl:col-start-1 xl:row-start-1 h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-modam text-xl font-bold">ایجاد حساب</h2>{member.role === "ADMIN" ? <AccountForm accounts={accounts} /> : <p className="mt-4 text-sm text-slate-600">فقط مدیر سازمان می‌تواند حساب ایجاد کند.</p>}</section></div></section>;
}
