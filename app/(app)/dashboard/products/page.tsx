import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Products } from "./products";

export const instant = false;

export default async function ProductsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { role: true, organization: { select: { name: true } } } });
  if (!member) redirect("/onboarding");
  return <section>
    <p className="text-sm font-semibold text-emerald-700">کالا و خدمات · {member.organization.name}</p>
    <h1 className="mt-3 font-modam text-3xl font-bold">کالا و خدمات</h1>
    <p className="mt-3 text-sm leading-7 text-slate-600">اطلاعات و قیمت کالاها و خدمات سازمان را ثبت و جست‌وجو کنید.</p>
    <Products canCreate={member.role !== "VIEWER"} />
  </section>;
}
