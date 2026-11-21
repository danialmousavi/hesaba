import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const amount = z.string().regex(/^(0|[1-9]\d{0,19})$/);
const schema = z.object({
  number: z.number().int().positive().max(2147483647),
  date: z.iso.date(),
  description: z.string().trim().min(1).max(500),
  lines: z.array(z.object({ accountId: z.string().cuid(), description: z.string().trim().max(500).optional(), debit: amount, credit: amount }).strict().refine((line) => (line.debit === "0") !== (line.credit === "0"))).min(1).max(100),
}).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true } });
  if (!member || member.role === "VIEWER") return Response.json({ error: "اجازهٔ ویرایش سند ندارید." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "اطلاعات سند معتبر نیست." }, { status: 400 });
  const date = new Date(`${parsed.data.date}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== parsed.data.date) return Response.json({ error: "تاریخ معتبر نیست." }, { status: 400 });
  const { id } = await params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const initial = await tx.journalEntry.findFirst({ where: { id, organizationId: member.organizationId }, select: { fiscalYearId: true } });
      if (!initial) return { status: 404, error: "سند پیدا نشد." } as const;
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${initial.fiscalYearId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "JournalEntry" WHERE id = ${id} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const entry = await tx.journalEntry.findFirst({ where: { id, organizationId: member.organizationId }, select: { status: true, fiscalYear: { select: { status: true, startDate: true, endDate: true } } } });
      if (!entry) return { status: 404, error: "سند پیدا نشد." } as const;
      if (entry.status !== "DRAFT") return { status: 409, error: "سند ثبت‌شده قابل ویرایش نیست." } as const;
      if (entry.fiscalYear.status !== "OPEN" || date < entry.fiscalYear.startDate || date > entry.fiscalYear.endDate) return { status: 409, error: "سال مالی بسته است یا تاریخ خارج از محدودهٔ آن است." } as const;
      const ids = [...new Set(parsed.data.lines.map((line) => line.accountId))].sort();
      for (const accountId of ids) await tx.$queryRaw`SELECT id FROM "LedgerAccount" WHERE id = ${accountId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      if (await tx.ledgerAccount.count({ where: { id: { in: ids }, organizationId: member.organizationId, isActive: true } }) !== ids.length) return { status: 400, error: "حساب‌های سند باید فعال و متعلق به سازمان باشند." } as const;
      await tx.journalLine.deleteMany({ where: { organizationId: member.organizationId, entryId: id } });
      const updated = await tx.journalEntry.update({ where: { id }, data: { number: parsed.data.number, date, description: parsed.data.description, lines: { create: parsed.data.lines.map((line) => ({ accountId: line.accountId, description: line.description, debit: line.debit, credit: line.credit })) } }, select: { id: true, number: true, status: true } });
      return { status: 200, entry: updated } as const;
    });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ entry: result.entry });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ error: "شمارهٔ سند در این سال مالی تکراری است." }, { status: 409 });
    console.error("Journal draft update failed", error);
    return Response.json({ error: "ویرایش پیش‌نویس انجام نشد." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true } });
  if (!member || member.role === "VIEWER") return Response.json({ error: "اجازهٔ حذف پیش‌نویس ندارید." }, { status: 403 });
  const { id } = await params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const initial = await tx.journalEntry.findFirst({ where: { id, organizationId: member.organizationId }, select: { fiscalYearId: true } });
      if (!initial) return { status: 404, error: "سند پیدا نشد." } as const;
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${initial.fiscalYearId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "JournalEntry" WHERE id = ${id} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const entry = await tx.journalEntry.findFirst({ where: { id, organizationId: member.organizationId }, select: { status: true, fiscalYear: { select: { status: true } } } });
      if (!entry) return { status: 404, error: "سند پیدا نشد." } as const;
      if (entry.status !== "DRAFT") return { status: 409, error: "سند ثبت‌شده قابل حذف نیست." } as const;
      if (entry.fiscalYear.status !== "OPEN") return { status: 409, error: "حذف پیش‌نویس در سال مالی بسته مجاز نیست." } as const;
      await tx.journalLine.deleteMany({ where: { organizationId: member.organizationId, entryId: id } });
      await tx.journalEntry.delete({ where: { id } });
      return { status: 200 } as const;
    });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Journal draft deletion failed", error);
    return Response.json({ error: "حذف پیش‌نویس انجام نشد." }, { status: 500 });
  }
}
