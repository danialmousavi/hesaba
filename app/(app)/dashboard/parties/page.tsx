import { readOrganizationPage } from "@/lib/organization-page";
import { Parties } from "./parties";

export const instant = false;

export default async function PartiesPage() {
  const { member } = await readOrganizationPage(async () => null);
  return <section>
    <p className="text-sm font-semibold text-emerald-700">اشخاص · {member.organization.name}</p>
    <h1 className="mt-3 font-modam text-3xl font-bold">مشتریان و تأمین‌کنندگان</h1>
    <p className="mt-3 text-sm leading-7 text-slate-600">اطلاعات اشخاص طرف حساب سازمان را ثبت و جست‌وجو کنید.</p>
    <Parties canCreate={member.role !== "VIEWER"} canManageAccounts={member.role === "ADMIN"} />
  </section>;
}
