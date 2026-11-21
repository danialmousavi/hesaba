import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JournalForm } from "./journal-form";
import { PostJournalButton } from "./post-journal-button";
import { DeleteDraftButton } from "./delete-draft-button";

export const instant = false;

export default async function JournalPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true, organization: { select: { name: true } } } });
  if (!member) redirect("/onboarding");
  const [year, accounts, entries] = await Promise.all([
    prisma.fiscalYear.findFirst({ where: { organizationId: member.organizationId, status: "OPEN" }, select: { id: true, name: true } }),
    prisma.ledgerAccount.findMany({ where: { organizationId: member.organizationId, isActive: true }, orderBy: { code: "asc" }, select: { id: true, name: true, code: true } }),
    prisma.journalEntry.findMany({ where: { organizationId: member.organizationId }, orderBy: [{ date: "desc" }, { number: "desc" }], select: { id: true, number: true, date: true, description: true, status: true, fiscalYear: { select: { name: true, status: true } }, lines: { select: { id: true, debit: true, credit: true, description: true, account: { select: { name: true, code: true } } } } } }),
  ]);
  const formatDate = (date: Date) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "long", timeZone: "UTC" }).format(date);
  const formatAmount = (value: { toString(): string }) => BigInt(value.toString()).toLocaleString("fa-IR");
  return <section><p className="text-sm font-semibold text-emerald-700">حسابداری · {member.organization.name}</p><h1 className="mt-3 font-modam text-3xl font-bold">اسناد حسابداری</h1><p className="mt-3 text-sm leading-7 text-slate-600">پیش‌نویس‌ها در ماندهٔ حساب‌ها اثری ندارند. سند متوازن را می‌توانید ثبت نهایی کنید.</p>
    <div className="mt-8 grid gap-6 xl:grid-cols-2"><section className="xl:col-start-2 xl:row-start-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-modam text-xl font-bold">فهرست اسناد</h2>{entries.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">هنوز سندی ثبت نشده است.</p> : <div className="mt-5 space-y-3">{entries.map((entry) => <details key={entry.id} className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-semibold">سند {entry.number} · {entry.description} <span className="text-slate-500">— {entry.status === "DRAFT" ? "پیش‌نویس" : "ثبت‌شده"}</span></summary><p className="mt-3 text-sm text-slate-600">{entry.fiscalYear.name} · {formatDate(entry.date)}</p><div className="mt-3 space-y-2">{entry.lines.map((line) => <div key={line.id} className="rounded-lg bg-slate-50 p-3 text-sm leading-7"><p>{line.account.code} — {line.account.name}</p><p className="text-slate-600">بدهکار: {formatAmount(line.debit)} · بستانکار: {formatAmount(line.credit)} ریال</p>{line.description && <p className="text-slate-500">{line.description}</p>}</div>)}</div>{entry.status === "DRAFT" && member.role !== "VIEWER" && <><Link href={`/dashboard/journal/${entry.id}/edit`} className="mt-4 inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">ویرایش پیش‌نویس</Link><PostJournalButton id={entry.id} number={entry.number} />{entry.fiscalYear.status === "OPEN" && <DeleteDraftButton id={entry.id} number={entry.number} />}</>}</details>)}</div>}</section>
    <section className="xl:col-start-1 xl:row-start-1 h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-modam text-xl font-bold">ایجاد پیش‌نویس</h2>{member.role === "VIEWER" ? <p className="mt-4 text-sm text-slate-600">نقش مشاهده‌گر اجازهٔ ایجاد سند ندارد.</p> : !year ? <p className="mt-4 text-sm leading-7 text-slate-600">ابتدا یک <Link href="/dashboard/fiscal-years" className="text-emerald-700 underline">سال مالی باز</Link> ایجاد کنید.</p> : accounts.length === 0 ? <p className="mt-4 text-sm leading-7 text-slate-600">ابتدا یک <Link href="/dashboard/accounts" className="text-emerald-700 underline">حساب فعال</Link> ایجاد کنید.</p> : <JournalForm year={year} accounts={accounts} />}</section></div>
  </section>;
}
