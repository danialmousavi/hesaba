import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const instant = false;

const roleLabels = {
  ADMIN: "مدیر",
  ACCOUNTANT: "حسابدار",
  VIEWER: "مشاهده‌گر",
} as const;

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      organization: {
        select: {
          name: true,
          slug: true,
          createdAt: true,
        },
      },
    },
  });

  if (!membership) {
    redirect("/onboarding");
  }

  return (
    <section className="w-full">
        <p className="text-sm font-medium text-emerald-700">نمای کلی</p>
        <h1 className="mt-3 font-modam text-3xl font-bold">خوش آمدید، {session.user.name}</h1>
        <p className="mt-3 leading-7 text-slate-600">
          ورود شما با موفقیت تأیید شد. داشبورد حسابداری در گام‌های بعدی تکمیل می‌شود.
        </p>

        <section
          aria-labelledby="active-organization-title"
          className="mt-8 rounded-xl border border-emerald-100 bg-emerald-50/60 p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-emerald-800">
                فضای کاری فعال
              </p>
              <h2 id="active-organization-title" className="mt-1 font-modam text-2xl font-bold text-slate-900">
                {membership.organization.name}
              </h2>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-emerald-800 shadow-sm ring-1 ring-emerald-100">
              نقش شما: {roleLabels[membership.role]}
            </span>
          </div>

          <dl className="mt-5 grid gap-3 border-t border-emerald-100 pt-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">شناسه سازمان</dt>
              <dd className="mt-1 font-medium text-slate-800" dir="ltr">
                {membership.organization.slug}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">تاریخ ایجاد</dt>
              <dd className="mt-1 font-medium text-slate-800">
                {new Intl.DateTimeFormat("fa-IR", {
                  dateStyle: "long",
                }).format(membership.organization.createdAt)}
              </dd>
            </div>
          </dl>
          <Link href="/dashboard/organization" className="mt-5 inline-block text-sm font-semibold text-emerald-800 underline underline-offset-4">مشاهده اطلاعات سازمان</Link>
        </section>
    </section>
  );
}
