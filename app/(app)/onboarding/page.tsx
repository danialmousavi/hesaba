import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrganizationForm } from "./organization-form";

export const instant = false;

export default async function OnboardingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (membership) {
    redirect("/dashboard");
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-right text-slate-900"
      dir="rtl"
    >
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-emerald-700">حسابا</p>
        <h1 className="mt-2 font-modam text-2xl font-bold tracking-tight">
          سازمان خود را بسازید
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          این سازمان، فضای کاری و داده‌های مالی شما را از دیگران جدا نگه می‌دارد.
        </p>
        <OrganizationForm />
      </section>
    </main>
  );
}
