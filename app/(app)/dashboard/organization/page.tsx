import { readOrganizationPage } from "@/lib/organization-page";

export const instant = false;

const roles = { ADMIN: "مدیر", ACCOUNTANT: "حسابدار", VIEWER: "مشاهده‌گر" } as const;

export default async function OrganizationPage() {
  const { member: membership } = await readOrganizationPage(async () => null);

  return (
    <section>
      <p className="text-sm font-medium text-emerald-700">فضای کاری</p>
      <h1 className="mt-3 font-modam text-3xl font-bold">سازمان من</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">اطلاعات سازمانی که در حال حاضر در آن فعالیت می‌کنید.</p>
      <dl className="mt-8 grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2 sm:p-8">
        <div><dt className="text-sm text-slate-500">نام سازمان</dt><dd className="mt-2 font-semibold">{membership.organization.name}</dd></div>
        <div><dt className="text-sm text-slate-500">نقش شما</dt><dd className="mt-2 font-semibold">{roles[membership.role]}</dd></div>
        <div><dt className="text-sm text-slate-500">شناسه سازمان</dt><dd className="mt-2 font-semibold" dir="ltr">{membership.organization.slug}</dd></div>
        <div><dt className="text-sm text-slate-500">تاریخ ایجاد</dt><dd className="mt-2 font-semibold">{new Intl.DateTimeFormat("fa-IR", { dateStyle: "long" }).format(membership.organization.createdAt)}</dd></div>
      </dl>
    </section>
  );
}
