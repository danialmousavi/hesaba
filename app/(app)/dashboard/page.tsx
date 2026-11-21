import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "./sign-out-button";

export const instant = false;

export default async function DashboardPage() {
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

  if (!membership) {
    redirect("/onboarding");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900" dir="rtl">
      <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-emerald-700">حسابا</p>
          <SignOutButton />
        </div>
        <h1 className="mt-5 font-modam text-3xl font-bold">خوش آمدید، {session.user.name}</h1>
        <p className="mt-3 leading-7 text-slate-600">
          ورود شما با موفقیت تأیید شد. داشبورد حسابداری در گام‌های بعدی تکمیل می‌شود.
        </p>
      </section>
    </main>
  );
}
