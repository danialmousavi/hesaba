import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Transactions } from "./transactions";

export const instant = false;

export default async function TransactionsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true, organization: { select: { name: true } } } });
  if (!member) redirect("/onboarding");
  const [years, accountRows] = await Promise.all([
    prisma.fiscalYear.findMany({ where: { organizationId: member.organizationId }, orderBy: { startDate: "desc" }, select: { id: true, name: true, status: true, startDate: true, endDate: true } }),
    prisma.ledgerAccount.findMany({ where: { organizationId: member.organizationId, isActive: true }, orderBy: { code: "asc" }, select: { id: true, name: true, code: true, type: true, children: { select: { id: true }, take: 1 }, partyLinks: { select: { id: true }, take: 1 } } }),
  ]);
  const accounts = accountRows.filter((account) => account.children.length === 0).map(({ id, name, code, type, partyLinks }) => ({ id, name, code, type, assignedToParty: partyLinks.length > 0 }));
  const serializedYears = years.map((year) => ({ ...year, startDate: year.startDate.toISOString().slice(0, 10), endDate: year.endDate.toISOString().slice(0, 10) }));
  return <section>
    <p className="text-sm font-semibold text-emerald-700">عملیات مالی · {member.organization.name}</p>
    <h1 className="mt-3 font-modam text-3xl font-bold">درآمد و هزینه</h1>
    <p className="mt-3 text-sm leading-7 text-slate-600">پیش‌نویس‌ها و درآمد و هزینه‌های ثبت‌شده را بررسی کنید.</p>
    <Transactions years={serializedYears} accounts={accounts} canWrite={member.role !== "VIEWER"} />
  </section>;
}
