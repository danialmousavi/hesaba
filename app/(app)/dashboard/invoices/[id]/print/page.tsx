import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { invoiceFields, serializeInvoice } from "@/lib/invoice-api";
import { prisma } from "@/lib/prisma";
import { DownloadPdfButton, PrintButton } from "./print-button";

export const instant = false;
const money = (value: string) => BigInt(value).toLocaleString("fa-IR");
const quantity = (value: string) => value.replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1").replace(/[0-9]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]).replace(".", "٫");
const dateFormat = new Intl.DateTimeFormat("fa-IR", { dateStyle: "long", timeZone: "UTC" });

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, organization: { select: { name: true } } } });
  if (!member) redirect("/onboarding");
  const id = z.string().cuid().safeParse((await params).id);
  if (!id.success) notFound();
  const record = await prisma.invoice.findFirst({ where: { id: id.data, organizationId: member.organizationId }, select: invoiceFields });
  if (!record) notFound();
  const invoice = serializeInvoice(record);
  const status = invoice.status === "DRAFT" ? "پیش‌نویس — صادر نشده" : invoice.status === "CANCELLED" ? "باطل‌شده" : "صادرشده";
  return <section className="mx-auto max-w-5xl text-slate-900 print:max-w-none print:text-black" dir="rtl">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3 print:hidden"><Link href="/dashboard/invoices" className="text-sm font-semibold text-emerald-700 underline underline-offset-4">بازگشت به فاکتورها</Link><div className="flex flex-wrap gap-2"><DownloadPdfButton id={invoice.id} number={invoice.number} /><PrintButton /></div></div>
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-800 pb-5 print:break-inside-avoid"><div><p className="text-sm text-slate-500 print:text-black">فروشنده</p><h1 className="mt-1 break-words font-modam text-2xl font-bold">{member.organization.name}</h1><p className="mt-2 text-xs text-slate-500 print:text-black">نام فروشنده بر اساس اطلاعات فعلی سازمان است.</p></div><div className="text-right"><h2 className="font-modam text-xl font-bold">فاکتور فروش</h2><p className="mt-2 text-sm font-semibold">وضعیت: {status}</p><p className="mt-1 text-sm">شماره: {invoice.number === null ? "تخصیص نیافته" : invoice.number.toLocaleString("fa-IR")}</p><p className="mt-1 text-sm">تاریخ: {dateFormat.format(new Date(`${invoice.date}T00:00:00Z`))}</p></div></header>
      {invoice.status !== "ISSUED" && <p className="mt-5 rounded-lg border border-slate-500 p-3 text-center text-base font-bold print:break-inside-avoid">{status}</p>}
      <div className="mt-6 rounded-xl bg-slate-50 p-4 print:break-inside-avoid print:border print:border-slate-300 print:bg-white"><p className="text-xs text-slate-500 print:text-black">خریدار</p><p className="mt-1 break-words text-base font-semibold">{invoice.customerName}</p>{invoice.description && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">شرح: {invoice.description}</p>}</div>
      <div className="mt-6 overflow-x-auto print:overflow-visible"><table className="w-full min-w-[720px] table-fixed border-collapse text-right text-xs leading-6 print:min-w-0 print:text-[9px] print:leading-4"><thead className="table-header-group"><tr className="border-y border-slate-400 bg-slate-50 print:bg-white"><th className="w-[5%] px-1 py-2">ردیف</th><th className="w-[23%] px-1 py-2">کالا یا خدمت</th><th className="w-[10%] px-1 py-2">تعداد / واحد</th><th className="w-[15%] px-1 py-2">قیمت واحد</th><th className="w-[14%] px-1 py-2">تخفیف</th><th className="w-[14%] px-1 py-2">مالیات</th><th className="w-[19%] px-1 py-2">مبلغ نهایی</th></tr></thead><tbody>{invoice.lines.map((line) => <tr key={line.id} className="break-inside-avoid border-b border-slate-200 align-top"><td className="px-1 py-2">{line.position.toLocaleString("fa-IR")}</td><td className="break-all px-1 py-2"><bdi>{line.productCode}</bdi><br />{line.productName}</td><td className="break-words px-1 py-2"><bdi>{quantity(line.quantity)}</bdi> {line.unit}</td><td className="break-all px-1 py-2">{money(line.unitPrice)}</td><td className="break-all px-1 py-2">{money(line.discountAmount)}</td><td className="break-all px-1 py-2">{money(line.taxAmount)}</td><td className="break-all px-1 py-2 font-semibold">{money(line.amounts.total)}</td></tr>)}</tbody></table></div>
      <p className="mt-2 text-xs text-slate-500 print:text-black">تمام مبالغ جدول به ریال است.</p>
      <dl className="mr-auto mt-6 w-full max-w-sm space-y-2 rounded-xl border border-slate-200 p-4 text-sm print:break-inside-avoid"><div className="flex justify-between gap-3"><dt>جمع کالاها و خدمات</dt><dd>{money(invoice.totals.subtotal)} ریال</dd></div><div className="flex justify-between gap-3"><dt>جمع تخفیف</dt><dd>{money(invoice.totals.discountAmount)} ریال</dd></div><div className="flex justify-between gap-3"><dt>جمع پس از تخفیف</dt><dd>{money(invoice.totals.taxableAmount)} ریال</dd></div><div className="flex justify-between gap-3"><dt>جمع مالیات</dt><dd>{money(invoice.totals.taxAmount)} ریال</dd></div><div className="flex justify-between gap-3 border-t border-slate-300 pt-3 font-bold"><dt>مبلغ نهایی</dt><dd className="break-all">{money(invoice.totals.total)} ریال</dd></div></dl>
    </article>
  </section>;
}
