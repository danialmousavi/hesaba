import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { invoiceFields, serializeInvoice } from "@/lib/invoice-api";
import { calculateInvoice, InvoiceCalculationError } from "@/lib/invoice-calculation";
import { lockJournalAccounts, markPartyAccountsUsed } from "@/lib/journal-account-locks";
import { prisma } from "@/lib/prisma";
import { isTransactionConflict } from "@/lib/prisma-errors";
import { guardOrganizationWrite, organizationContext, organizationContextError } from "@/lib/organization-context";

const inputSchema = z.strictObject({
  revision: z.number().int().min(0).max(2147483646),
  revenueAccountId: z.string().cuid(),
  taxAccountId: z.string().cuid().nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const member = await organizationContext(request, 403).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  if (member.role === "VIEWER") return Response.json({ error: "اجازه صدور فاکتور ندارید." }, { status: 403 });
  const id = z.string().cuid().safeParse((await params).id);
  if (!id.success) return Response.json({ error: "شناسه فاکتور معتبر نیست." }, { status: 400 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "اطلاعات صدور معتبر نیست." }, { status: 400 });
  const input = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      await guardOrganizationWrite(tx, member, request, ["ADMIN", "ACCOUNTANT"]);
      const initial = await tx.invoice.findFirst({ where: { id: id.data, organizationId: member.organizationId }, select: { fiscalYearId: true } });
      if (!initial) return { status: 404, error: "فاکتور پیدا نشد." } as const;
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${initial.fiscalYearId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${id.data} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const invoice = await tx.invoice.findFirst({ where: { id: id.data, organizationId: member.organizationId }, select: { ...invoiceFields, fiscalYear: { select: { status: true, startDate: true, endDate: true } } } });
      if (!invoice) return { status: 404, error: "فاکتور پیدا نشد." } as const;
      if (invoice.status !== "DRAFT") return { status: 409, error: "فاکتور قبلاً صادر شده است." } as const;
      if (invoice.revision !== input.revision) return { status: 409, error: "فاکتور تغییر کرده است؛ پیش از صدور آن را دوباره بررسی کنید." } as const;
      if (invoice.fiscalYear.status !== "OPEN" || invoice.date < invoice.fiscalYear.startDate || invoice.date > invoice.fiscalYear.endDate) return { status: 409, error: "سال مالی بسته است یا تاریخ فاکتور معتبر نیست." } as const;
      const amounts = calculateInvoice(invoice.lines.map((line) => ({ quantity: line.quantity.toFixed(3), unitPrice: line.unitPrice.toFixed(0), discountAmount: line.discountAmount.toFixed(0), taxAmount: line.taxAmount.toFixed(0) })));
      const revenue = BigInt(amounts.totals.taxableAmount), tax = BigInt(amounts.totals.taxAmount), total = BigInt(amounts.totals.total);
      if (total <= 0n) return { status: 400, error: "مبلغ نهایی فاکتور باید بزرگ‌تر از صفر باشد." } as const;
      if ((tax > 0n) !== (input.taxAccountId !== null)) return { status: 400, error: "برای مالیات مثبت حساب بدهی مالیات لازم است؛ برای مالیات صفر حساب مالیات انتخاب نکنید." } as const;
      const link = await tx.partyAccount.findFirst({ where: { organizationId: member.organizationId, partyId: invoice.customerId, purpose: "RECEIVABLE" }, select: { accountId: true } });
      if (!link) return { status: 409, error: "حساب دریافتنی مشتری مشخص نیست." } as const;
      const accountIds = [link.accountId, input.revenueAccountId, ...(input.taxAccountId ? [input.taxAccountId] : [])];
      if (new Set(accountIds).size !== accountIds.length) return { status: 400, error: "حساب‌های دریافتنی، درآمد و مالیات باید متفاوت باشند." } as const;
      if (!await lockJournalAccounts(tx, member.organizationId, accountIds)) return { status: 409, error: "حساب یا شخص مرتبط معتبر و فعال نیست." } as const;
      const customer = await tx.party.findFirst({ where: { id: invoice.customerId, organizationId: member.organizationId, isCustomer: true, isActive: true }, select: { id: true } });
      const currentLink = await tx.partyAccount.findFirst({ where: { organizationId: member.organizationId, partyId: invoice.customerId, purpose: "RECEIVABLE", accountId: link.accountId }, select: { id: true } });
      const accounts = await tx.ledgerAccount.findMany({ where: { organizationId: member.organizationId, id: { in: accountIds } }, select: { id: true, type: true, children: { select: { id: true }, take: 1 }, partyLinks: { select: { id: true }, take: 1 } } });
      const receivableAccount = accounts.find((account) => account.id === link.accountId);
      const revenueAccount = accounts.find((account) => account.id === input.revenueAccountId);
      const taxAccount = accounts.find((account) => account.id === input.taxAccountId);
      if (!customer || !currentLink || receivableAccount?.type !== "ASSET" || receivableAccount.children.length || revenueAccount?.type !== "REVENUE" || revenueAccount.children.length || revenueAccount.partyLinks.length || (input.taxAccountId && (taxAccount?.type !== "LIABILITY" || taxAccount.children.length || taxAccount.partyLinks.length))) return { status: 409, error: "مشتری یا حساب‌های دریافتنی، درآمد و مالیات معتبر و فعال نیستند." } as const;
      const productIds = [...new Set(invoice.lines.map((line) => line.productId))].sort();
      if (!productIds.length) return { status: 400, error: "فاکتور باید حداقل یک قلم داشته باشد." } as const;
      await tx.$queryRaw`SELECT id FROM "Product" WHERE "organizationId" = ${member.organizationId} AND id IN (${Prisma.join(productIds)}) ORDER BY id FOR UPDATE`;
      if (await tx.product.count({ where: { organizationId: member.organizationId, id: { in: productIds }, isActive: true } }) !== productIds.length) return { status: 409, error: "یک یا چند کالا یا خدمت فاکتور غیرفعال شده‌اند." } as const;
      const [lastEntry, lastInvoice] = await Promise.all([
        tx.journalEntry.aggregate({ where: { organizationId: member.organizationId, fiscalYearId: invoice.fiscalYearId }, _max: { number: true } }),
        tx.invoice.aggregate({ where: { organizationId: member.organizationId, fiscalYearId: invoice.fiscalYearId }, _max: { number: true } }),
      ]);
      const journalNumber = (lastEntry._max.number ?? 0) + 1, invoiceNumber = (lastInvoice._max.number ?? 0) + 1;
      if (journalNumber > 2147483647 || invoiceNumber > 2147483647) return { status: 409, error: "شماره جدید فاکتور یا سند در دسترس نیست." } as const;
      const lines = [
        { accountId: link.accountId, debit: total.toString(), credit: "0" },
        ...(revenue > 0n ? [{ accountId: input.revenueAccountId, debit: "0", credit: revenue.toString() }] : []),
        ...(tax > 0n && input.taxAccountId ? [{ accountId: input.taxAccountId, debit: "0", credit: tax.toString() }] : []),
      ];
      const entry = await tx.journalEntry.create({ data: { organizationId: member.organizationId, fiscalYearId: invoice.fiscalYearId, number: journalNumber, date: invoice.date, description: `فاکتور فروش ${invoiceNumber} — ${invoice.customerName}`, lines: { create: lines } }, select: { id: true } });
      await markPartyAccountsUsed(tx, member.organizationId, accountIds);
      await tx.journalEntry.update({ where: { id: entry.id }, data: { status: "POSTED" } });
      await tx.journalEvent.create({ data: { organizationId: member.organizationId, entryId: entry.id, actorId: member.userId, actorName: member.userName, action: "POSTED" } });
      const issued = await tx.invoice.update({ where: { id: invoice.id }, data: { status: "ISSUED", number: invoiceNumber, journalEntryId: entry.id, revision: { increment: 1 } }, select: invoiceFields });
      return { status: 200, invoice: serializeInvoice(issued), journal: { id: entry.id, number: journalNumber } } as const;
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ invoice: result.invoice, journal: result.journal }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    if (error instanceof InvoiceCalculationError) return Response.json({ error: "مبالغ فاکتور معتبر نیستند." }, { status: 400 });
    if (isTransactionConflict(error) || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) return Response.json({ error: "تغییر هم‌زمان رخ داد؛ فاکتور را دوباره بررسی کنید." }, { status: 409 });
    console.error("Invoice issuing failed", error);
    return Response.json({ error: "صدور فاکتور انجام نشد." }, { status: 500 });
  }
}
