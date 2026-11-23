import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTransactionConflict } from "@/lib/prisma-errors";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true } });
  if (!member || member.role === "VIEWER") return Response.json({ error: "اجازه حذف پیش‌نویس ندارید." }, { status: 403 });
  const id = z.string().cuid().safeParse((await params).id);
  if (!id.success) return Response.json({ error: "شناسه پیش‌نویس معتبر نیست." }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const initial = await tx.financialTransaction.findFirst({ where: { id: id.data, organizationId: member.organizationId }, select: { fiscalYearId: true } });
      if (!initial) return { status: 404, error: "پیش‌نویس پیدا نشد." } as const;
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${initial.fiscalYearId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "FinancialTransaction" WHERE id = ${id.data} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const record = await tx.financialTransaction.findFirst({ where: { id: id.data, organizationId: member.organizationId }, select: { status: true, fiscalYear: { select: { status: true } } } });
      if (!record) return { status: 404, error: "پیش‌نویس پیدا نشد." } as const;
      if (record.status !== "DRAFT") return { status: 409, error: "رویداد ثبت‌شده قابل حذف نیست." } as const;
      if (record.fiscalYear.status !== "OPEN") return { status: 409, error: "حذف پیش‌نویس در سال مالی بسته مجاز نیست." } as const;
      await tx.financialTransaction.delete({ where: { id: id.data } });
      return { status: 200 } as const;
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isTransactionConflict(error)) return Response.json({ error: "تغییر هم‌زمان رخ داد؛ دوباره تلاش کنید." }, { status: 409 });
    console.error("Financial draft deletion failed", error);
    return Response.json({ error: "حذف پیش‌نویس درآمد و هزینه انجام نشد." }, { status: 500 });
  }
}
