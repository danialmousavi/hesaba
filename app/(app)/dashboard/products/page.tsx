import { readOrganizationPage } from "@/lib/organization-page";
import { Products } from "./products";

export const instant = false;

export default async function ProductsPage() {
  const { member } = await readOrganizationPage(async () => null);
  return <section>
    <p className="text-sm font-semibold text-emerald-700">کالا و خدمات · {member.organization.name}</p>
    <h1 className="mt-3 font-modam text-3xl font-bold">کالا و خدمات</h1>
    <p className="mt-3 text-sm leading-7 text-slate-600">اطلاعات و قیمت کالاها و خدمات سازمان را ثبت و جست‌وجو کنید.</p>
    <Products canCreate={member.role !== "VIEWER"} />
  </section>;
}
