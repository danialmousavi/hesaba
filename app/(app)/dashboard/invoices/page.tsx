import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Invoices } from "./invoices";

export const instant = false;

export default async function InvoicesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true, organization: { select: { name: true } } } });
  if (!member) redirect("/onboarding");
  const [years, customers, products] = await Promise.all([
    prisma.fiscalYear.findMany({ where: { organizationId: member.organizationId }, orderBy: { startDate: "desc" }, select: { id: true, name: true, status: true, startDate: true, endDate: true } }),
    prisma.party.findMany({ where: { organizationId: member.organizationId, isActive: true, isCustomer: true }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true } }),
    prisma.product.findMany({ where: { organizationId: member.organizationId, isActive: true }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, code: true, unit: true, salePrice: true } }),
  ]);
  return <section>
    <p className="text-sm font-semibold text-emerald-700">فروش · {member.organization.name}</p>
    <h1 className="mt-3 font-modam text-3xl font-bold">فاکتورهای فروش</h1>
    <p className="mt-3 text-sm leading-7 text-slate-600">پیش‌نویس فاکتورها را ثبت و بررسی کنید.</p>
    <Invoices years={years.map((year) => ({ ...year, startDate: year.startDate.toISOString().slice(0, 10), endDate: year.endDate.toISOString().slice(0, 10) }))} customers={customers} products={products.map((product) => ({ ...product, salePrice: product.salePrice.toFixed(0) }))} canWrite={member.role !== "VIEWER"} />
  </section>;
}
