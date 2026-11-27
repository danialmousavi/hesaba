import { readOrganizationPage } from "@/lib/organization-page";
import { Receipts } from "./receipts";

export const instant = false;

export default async function ReceiptsPage() {
  const { member, data: [year, parties, accounts] } = await readOrganizationPage((tx, member) => Promise.all([
    tx.fiscalYear.findFirst({ where: { organizationId: member.organizationId, status: "OPEN" }, select: { id: true, name: true, startDate: true, endDate: true } }),
    tx.party.findMany({ where: { organizationId: member.organizationId, isActive: true, isCustomer: true }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, accountLinks: { where: { purpose: "RECEIVABLE" }, select: { account: { select: { id: true, code: true, name: true, isActive: true, children: { select: { id: true }, take: 1 } } } } } } }),
    tx.ledgerAccount.findMany({ where: { organizationId: member.organizationId, isActive: true, type: "ASSET", children: { none: {} }, partyLinks: { none: {} } }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
  ]));
  const customers = parties.map(({ id, name, accountLinks }) => { const account = accountLinks[0]?.account; return { id, name, receivable: account ? { id: account.id, code: account.code, name: account.name, isActive: account.isActive, hasChildren: account.children.length > 0 } : null }; });
  return <section><p className="text-sm font-semibold text-emerald-700">دریافت‌ها · {member.organization.name}</p><h1 className="mt-3 font-modam text-3xl font-bold">دریافت از مشتریان</h1><p className="mt-3 text-sm leading-7 text-slate-600">دریافت وجه را به فاکتورهای صادرشده تخصیص دهید و سوابق را بررسی کنید.</p>
    <Receipts storageKey={`hesaba-receipt:${member.userId}:${member.organizationId}`} year={year ? { ...year, startDate: year.startDate.toISOString().slice(0, 10), endDate: year.endDate.toISOString().slice(0, 10) } : null} customers={customers} accounts={accounts} canWrite={member.role !== "VIEWER"} />
  </section>;
}
