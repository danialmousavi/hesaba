import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JournalForm } from "./journal-form";
import { PostJournalButton } from "./post-journal-button";
import { DeleteDraftButton } from "./delete-draft-button";
import { ReverseJournal } from "./reverse-journal";

export const instant = false;

export default async function JournalPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true, organization: { select: { name: true } } } });
  if (!member) redirect("/onboarding");
  const [years, accounts, entries] = await Promise.all([
    prisma.fiscalYear.findMany({ where: { organizationId: member.organizationId, status: "OPEN" }, orderBy: { startDate: "desc" }, select: { id: true, name: true, startDate: true, endDate: true } }),
    prisma.ledgerAccount.findMany({ where: { organizationId: member.organizationId, isActive: true }, orderBy: { code: "asc" }, select: { id: true, name: true, code: true } }),
    prisma.journalEntry.findMany({ where: { organizationId: member.organizationId }, orderBy: [{ date: "desc" }, { number: "desc" }], select: { id: true, kind: true, number: true, date: true, description: true, status: true, fiscalYear: { select: { name: true, status: true } }, reversal: { select: { reversal: { select: { id: true, number: true, status: true, fiscalYear: { select: { name: true } } } } } }, reversalOf: { select: { source: { select: { id: true, number: true, fiscalYear: { select: { name: true } } } } } }, invoice: { select: { id: true } }, payment: { select: { id: true } }, financialTransaction: { select: { id: true } }, lines: { select: { id: true, debit: true, credit: true, description: true, account: { select: { name: true, code: true } } } } } }),
  ]);
  const year = years[0];
  const formatDate = (date: Date) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "long", timeZone: "UTC" }).format(date);
  const formatAmount = (value: { toString(): string }) => BigInt(value.toString()).toLocaleString("fa-IR");
  return <section>
    <p className="text-sm font-semibold text-emerald-700">حسابداری · {member.organization.name}</p>
    <h1 className="mt-3 font-modam text-3xl font-bold">اسناد حسابداری</h1>
    <p className="mt-3 text-sm leading-7 text-slate-600">پیش‌نویس‌ها در ماندهٔ حساب‌ها اثری ندارند. سند متوازن را می‌توانید ثبت نهایی کنید.</p>
    <div className="mt-8 grid gap-6 xl:grid-cols-2">
      <section className="xl:col-start-2 xl:row-start-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-modam text-xl font-bold">فهرست اسناد</h2>
        {entries.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">هنوز سندی ثبت نشده است.</p> : <div className="mt-5 space-y-3">{entries.map((entry) => <details key={entry.id} id={`journal-${entry.id}`} className="rounded-xl border border-slate-200 p-4">
          <summary className="cursor-pointer text-sm font-semibold">سند {entry.number} · {entry.description} <span className="text-slate-500">— {entry.status === "DRAFT" ? "پیش‌نویس" : "ثبت‌شده"}</span></summary>
          <p className="mt-3 text-sm text-slate-600">{entry.fiscalYear.name} · {formatDate(entry.date)}</p>
          {entry.kind !== "NORMAL" && <p className="mt-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">سند سیستمی {entry.kind === "OPENING" ? "افتتاحیه" : "اختتامیه"} است و برگشت مستقیم ندارد.</p>}
          {entry.reversal && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">سند برگشتی: <a className="underline" href={`#journal-${entry.reversal.reversal.id}`}>شمارهٔ {entry.reversal.reversal.number} · {entry.reversal.reversal.fiscalYear.name}</a> — {entry.reversal.reversal.status === "DRAFT" ? "پیش‌نویس" : "ثبت‌شده"}</p>}
          {entry.reversalOf && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">برگشت سند <a className="underline" href={`#journal-${entry.reversalOf.source.id}`}>شمارهٔ {entry.reversalOf.source.number} · {entry.reversalOf.source.fiscalYear.name}</a></p>}
          <div className="mt-3 space-y-2">{entry.lines.map((line) => <div key={line.id} className="rounded-lg bg-slate-50 p-3 text-sm leading-7"><p>{line.account.code} — {line.account.name}</p><p className="text-slate-600">بدهکار: {formatAmount(line.debit)} · بستانکار: {formatAmount(line.credit)} ریال</p>{line.description && <p className="text-slate-500">{line.description}</p>}</div>)}</div>
          {entry.status === "DRAFT" && member.role !== "VIEWER" && <>
            {!entry.reversalOf && <Link href={`/dashboard/journal/${entry.id}/edit`} className="mt-4 inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">ویرایش پیش‌نویس</Link>}
            <PostJournalButton id={entry.id} number={entry.number} />
            {entry.fiscalYear.status === "OPEN" && <DeleteDraftButton id={entry.id} number={entry.number} />}
          </>}
          {entry.kind === "NORMAL" && entry.status === "POSTED" && !entry.reversal && !entry.reversalOf && (entry.invoice || entry.payment || entry.financialTransaction ? <p className="mt-4 text-sm leading-7 text-slate-500">این سند به عملیات دیگری متصل است؛ برگشت آن از مسیر اصلاح همان عملیات انجام می‌شود که هنوز آماده نیست.</p> : member.role !== "VIEWER" && <ReverseJournal id={entry.id} number={entry.number} sourceDate={entry.date.toISOString().slice(0, 10)} years={years.filter((item) => item.endDate >= entry.date).map((item) => ({ ...item, startDate: item.startDate.toISOString().slice(0, 10), endDate: item.endDate.toISOString().slice(0, 10) }))} lines={entry.lines.map((line) => ({ ...line, debit: line.debit.toFixed(0), credit: line.credit.toFixed(0) }))} />)}
        </details>)}</div>}
      </section>
      <section className="xl:col-start-1 xl:row-start-1 h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-modam text-xl font-bold">ایجاد پیش‌نویس</h2>{member.role === "VIEWER" ? <p className="mt-4 text-sm text-slate-600">نقش مشاهده‌گر اجازهٔ ایجاد سند ندارد.</p> : !year ? <p className="mt-4 text-sm leading-7 text-slate-600">ابتدا یک <Link href="/dashboard/fiscal-years" className="text-emerald-700 underline">سال مالی باز</Link> ایجاد کنید.</p> : accounts.length === 0 ? <p className="mt-4 text-sm leading-7 text-slate-600">ابتدا یک <Link href="/dashboard/accounts" className="text-emerald-700 underline">حساب فعال</Link> ایجاد کنید.</p> : <JournalForm year={year} accounts={accounts} />}</section>
    </div>
  </section>;
}
