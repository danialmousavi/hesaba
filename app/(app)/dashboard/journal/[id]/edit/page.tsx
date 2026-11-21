import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JournalForm } from "../../journal-form";

export const instant = false;

export default async function EditJournalPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true } });
  if (!member) redirect("/onboarding");
  if (member.role === "VIEWER") redirect("/dashboard/journal");
  const { id } = await params;
  const entry = await prisma.journalEntry.findFirst({ where: { id, organizationId: member.organizationId }, select: { id: true, number: true, date: true, description: true, status: true, fiscalYear: { select: { id: true, name: true, status: true } }, lines: { select: { accountId: true, debit: true, credit: true, description: true } } } });
  if (!entry) notFound();
  const accounts = await prisma.ledgerAccount.findMany({ where: { organizationId: member.organizationId }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true, isActive: true } });
  const initial = { id: entry.id, number: entry.number, date: entry.date.toISOString().slice(0, 10), description: entry.description, lines: entry.lines.map((line) => ({ accountId: line.accountId, description: line.description, debit: line.debit.toFixed(0), credit: line.credit.toFixed(0) })) };
  return <section><Link href="/dashboard/journal" className="text-sm font-semibold text-emerald-700 underline underline-offset-4">بازگشت به اسناد</Link><h1 className="mt-5 font-modam text-3xl font-bold">ویرایش پیش‌نویس {entry.number}</h1><div className="mt-6 max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{entry.status !== "DRAFT" ? <p className="text-sm text-slate-600">سند نهایی قابل ویرایش نیست.</p> : entry.fiscalYear.status !== "OPEN" ? <p className="text-sm text-slate-600">سال مالی این سند بسته است و ویرایش امکان‌پذیر نیست.</p> : <JournalForm year={entry.fiscalYear} accounts={accounts} initial={initial} />}</div></section>;
}
