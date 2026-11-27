import { readOrganizationPage } from "@/lib/organization-page";
import { Invoices } from "./invoices";

export const instant = false;

export default async function InvoicesPage() {
  const { member, data: [years, customers, products, accountRows] } = await readOrganizationPage((tx, member) => Promise.all([
    tx.fiscalYear.findMany({ where: { organizationId: member.organizationId }, orderBy: { startDate: "desc" }, select: { id: true, name: true, status: true, startDate: true, endDate: true } }),
    tx.party.findMany({ where: { organizationId: member.organizationId, isActive: true, isCustomer: true }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, accountLinks: { where: { purpose: "RECEIVABLE" }, select: { account: { select: { id: true, code: true, name: true, isActive: true, children: { select: { id: true }, take: 1 } } } } } } }),
    tx.product.findMany({ where: { organizationId: member.organizationId, isActive: true }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, code: true, unit: true, salePrice: true } }),
    tx.ledgerAccount.findMany({ where: { organizationId: member.organizationId, isActive: true, type: { in: ["REVENUE", "LIABILITY"] }, children: { none: {} }, partyLinks: { none: {} } }, orderBy: { code: "asc" }, select: { id: true, name: true, code: true, type: true } }),
  ]));
  return <section>
    <p className="text-sm font-semibold text-emerald-700">فروش · {member.organization.name}</p>
    <h1 className="mt-3 font-modam text-3xl font-bold">فاکتورهای فروش</h1>
    <p className="mt-3 text-sm leading-7 text-slate-600">پیش‌نویس و فاکتورهای صادرشده را ثبت و بررسی کنید.</p>
    <Invoices years={years.map((year) => ({ ...year, startDate: year.startDate.toISOString().slice(0, 10), endDate: year.endDate.toISOString().slice(0, 10) }))} customers={customers.map(({ id, name, accountLinks }) => { const account = accountLinks[0]?.account; return { id, name, receivable: account ? { id: account.id, code: account.code, name: account.name, isActive: account.isActive, hasChildren: account.children.length > 0 } : null }; })} products={products.map((product) => ({ ...product, salePrice: product.salePrice.toFixed(0) }))} accounts={accountRows.filter((account): account is typeof account & { type: "REVENUE" | "LIABILITY" } => account.type === "REVENUE" || account.type === "LIABILITY")} canWrite={member.role !== "VIEWER"} />
  </section>;
}
