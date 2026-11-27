import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { lockJournalAccounts, markPartyAccountsUsed } from "@/lib/journal-account-locks";
import { isTransactionConflict } from "@/lib/prisma-errors";
import { guardOrganizationRead, guardOrganizationWrite, organizationContext, organizationContextError } from "@/lib/organization-context";

const amount = z.string().regex(/^(0|[1-9]\d{0,19})$/, "مبلغ باید عدد صحیح غیرمنفی و حداکثر ۲۰ رقم باشد.");
const schema = z.object({
  fiscalYearId: z.string().cuid(),
  number: z.number().int().positive().max(2147483647),
  date: z.iso.date(),
  description: z.string().trim().min(1).max(500),
  lines: z.array(z.object({
    accountId: z.string().cuid(),
    description: z.string().trim().max(500).optional(),
    debit: amount,
    credit: amount,
  }).strict().refine((line) => (line.debit === "0") !== (line.credit === "0"), "هر ردیف باید فقط یک مبلغ مثبت داشته باشد.")).min(1).max(100),
}).strict();

export async function GET(request: Request) {
  const membership = await organizationContext(request).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (membership instanceof Error) return organizationContextError(membership) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  const params = new URL(request.url).searchParams;
  const allowed = ["fiscalYearId", "status", "from", "to", "q", "page", "pageSize"];
  if ([...params.keys()].some((key) => !allowed.includes(key) || params.getAll(key).length !== 1)) return Response.json({ error: "پارامترهای جست‌وجوی سند معتبر نیستند." }, { status: 400 });
  const positiveInteger = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(1000000));
  const parsed = z.object({ fiscalYearId: z.string().cuid().optional(), status: z.enum(["DRAFT", "POSTED"]).optional(), from: z.iso.date().optional(), to: z.iso.date().optional(), q: z.string().trim().min(1).max(100).optional(), page: positiveInteger.optional(), pageSize: positiveInteger.pipe(z.number().max(100)).optional() }).safeParse(Object.fromEntries(params));
  if (!parsed.success || (parsed.data.from && parsed.data.to && parsed.data.from > parsed.data.to)) return Response.json({ error: "پارامترهای جست‌وجوی سند معتبر نیستند." }, { status: 400 });
  const { fiscalYearId, status, from, to, q } = parsed.data;
  const page = parsed.data.page ?? 1, pageSize = parsed.data.pageSize ?? 25;
  if ((page - 1) * pageSize > 1000000) return Response.json({ error: "شماره صفحه معتبر نیست." }, { status: 400 });
  const numericQuery = q && /^[1-9]\d*$/.test(q) && Number(q) <= 2147483647 ? Number(q) : null;
  const where: Prisma.JournalEntryWhereInput = { organizationId: membership.organizationId, ...(fiscalYearId && { fiscalYearId }), ...(status && { status }), ...(from || to ? { date: { ...(from && { gte: new Date(`${from}T00:00:00Z`) }), ...(to && { lte: new Date(`${to}T00:00:00Z`) }) } } : {}), ...(q && { OR: [{ description: { contains: q, mode: "insensitive" } }, ...(numericQuery ? [{ number: numericQuery }] : [])] }) };
  try {
    const result = await prisma.$transaction(async (tx) => {
      await guardOrganizationRead(tx, membership);
      if (fiscalYearId && !await tx.fiscalYear.findFirst({ where: { id: fiscalYearId, organizationId: membership.organizationId }, select: { id: true } })) return null;
      const [entries, total] = await Promise.all([
        tx.journalEntry.findMany({ where, orderBy: [{ date: "desc" }, { number: "desc" }, { id: "desc" }], ...(parsed.data.page !== undefined || parsed.data.pageSize !== undefined ? { skip: (page - 1) * pageSize, take: pageSize } : {}), select: { id: true, kind: true, fiscalYearId: true, number: true, date: true, description: true, status: true, reversal: { select: { reversalEntryId: true } }, reversalOf: { select: { sourceEntryId: true } }, invoice: { select: { id: true } }, payment: { select: { id: true } }, financialTransaction: { select: { id: true } }, lines: { select: { id: true, accountId: true, description: true, debit: true, credit: true } } } }),
        tx.journalEntry.count({ where }),
      ]);
      return { entries, total, organizationId: membership.organizationId, ...(parsed.data.page !== undefined || parsed.data.pageSize !== undefined ? { page, pageSize } : {}) };
    }, { isolationLevel: "RepeatableRead" });
    if (!result) return Response.json({ error: "سال مالی پیدا نشد." }, { status: 404 });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    console.error("Journal list failed", error);
    return Response.json({ error: "دریافت فهرست اسناد انجام نشد." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const membership = await organizationContext(request).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (membership instanceof Error) return organizationContextError(membership) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  if (membership.role === "VIEWER") return Response.json({ error: "اجازهٔ ایجاد سند ندارید." }, { status: 403 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: input.error.issues[0]?.message ?? "اطلاعات سند معتبر نیست." }, { status: 400 });
  const date = new Date(`${input.data.date}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== input.data.date) return Response.json({ error: "تاریخ معتبر نیست." }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      await guardOrganizationWrite(tx, membership, request, ["ADMIN", "ACCOUNTANT"]);
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${input.data.fiscalYearId} AND "organizationId" = ${membership.organizationId} FOR UPDATE`;
      const year = await tx.fiscalYear.findFirst({ where: { id: input.data.fiscalYearId, organizationId: membership.organizationId, status: "OPEN", startDate: { lte: date }, endDate: { gte: date } }, select: { id: true } });
      if (!year) return null;
      const ids = await lockJournalAccounts(tx, membership.organizationId, input.data.lines.map((line) => line.accountId));
      if (!ids) return null;
      const entry = await tx.journalEntry.create({ data: { organizationId: membership.organizationId, fiscalYearId: year.id, number: input.data.number, date, description: input.data.description, lines: { create: input.data.lines.map((line) => ({ accountId: line.accountId, description: line.description, debit: line.debit, credit: line.credit })) } }, select: { id: true, number: true, status: true } });
      await markPartyAccountsUsed(tx, membership.organizationId, ids);
      return entry;
    }, { isolationLevel: "Serializable" });
    if (!result) return Response.json({ error: "سال مالی، تاریخ، حساب فعال یا وضعیت شخص متصل معتبر نیست؛ در صورت تغییر هم‌زمان دوباره تلاش کنید." }, { status: 400 });
    return Response.json({ entry: result }, { status: 201 });
  } catch (error) {
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ error: "شمارهٔ سند در این سال مالی تکراری است." }, { status: 409 });
    if (isTransactionConflict(error)) return Response.json({ error: "تغییر هم‌زمان رخ داد؛ دوباره تلاش کنید." }, { status: 409 });
    console.error("Journal draft creation failed", error);
    return Response.json({ error: "ایجاد پیش‌نویس انجام نشد." }, { status: 500 });
  }
}
