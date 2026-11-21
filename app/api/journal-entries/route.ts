import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

async function member(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  return prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true } });
}

export async function GET(request: Request) {
  const membership = await member(request);
  if (!membership) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });
  const entries = await prisma.journalEntry.findMany({ where: { organizationId: membership.organizationId }, orderBy: [{ date: "desc" }, { number: "desc" }], select: { id: true, fiscalYearId: true, number: true, date: true, description: true, status: true, lines: { select: { id: true, accountId: true, description: true, debit: true, credit: true } } } });
  return Response.json({ entries }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const membership = await member(request);
  if (!membership) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });
  if (membership.role === "VIEWER") return Response.json({ error: "اجازهٔ ایجاد سند ندارید." }, { status: 403 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: input.error.issues[0]?.message ?? "اطلاعات سند معتبر نیست." }, { status: 400 });
  const date = new Date(`${input.data.date}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== input.data.date) return Response.json({ error: "تاریخ معتبر نیست." }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${input.data.fiscalYearId} AND "organizationId" = ${membership.organizationId} FOR UPDATE`;
      const year = await tx.fiscalYear.findFirst({ where: { id: input.data.fiscalYearId, organizationId: membership.organizationId, status: "OPEN", startDate: { lte: date }, endDate: { gte: date } }, select: { id: true } });
      if (!year) return null;
      const ids = [...new Set(input.data.lines.map((line) => line.accountId))].sort();
      for (const id of ids) await tx.$queryRaw`SELECT id FROM "LedgerAccount" WHERE id = ${id} AND "organizationId" = ${membership.organizationId} FOR UPDATE`;
      const count = await tx.ledgerAccount.count({ where: { id: { in: ids }, organizationId: membership.organizationId, isActive: true } });
      if (count !== ids.length) return null;
      return tx.journalEntry.create({ data: { organizationId: membership.organizationId, fiscalYearId: year.id, number: input.data.number, date, description: input.data.description, lines: { create: input.data.lines.map((line) => ({ accountId: line.accountId, description: line.description, debit: line.debit, credit: line.credit })) } }, select: { id: true, number: true, status: true } });
    });
    if (!result) return Response.json({ error: "سال مالی باز، تاریخ سند یا حساب‌های فعال سازمان معتبر نیستند." }, { status: 400 });
    return Response.json({ entry: result }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ error: "شمارهٔ سند در این سال مالی تکراری است." }, { status: 409 });
    console.error("Journal draft creation failed", error);
    return Response.json({ error: "ایجاد پیش‌نویس انجام نشد." }, { status: 500 });
  }
}
