import { prisma } from "@/lib/prisma";
import { guardOrganizationWrite, organizationContext, organizationContextError } from "@/lib/organization-context";
import { isTransactionConflict } from "@/lib/prisma-errors";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  }
  const member = await organizationContext(request, 403).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  if (member.role !== "ADMIN") {
    return Response.json({ error: "فقط مدیر سازمان می‌تواند سال مالی را ببندد." }, { status: 403 });
  }
  const { id } = await params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      await guardOrganizationWrite(tx, member, request, ["ADMIN"]);
      await tx.$queryRaw`SELECT id FROM "FiscalYear" WHERE id = ${id} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const year = await tx.fiscalYear.findFirst({ where: { id, organizationId: member.organizationId }, select: { status: true } });
      if (!year) return { status: 404, error: "سال مالی پیدا نشد." } as const;
      if (year.status !== "OPEN") return { status: 409, error: "این سال مالی قبلاً بسته شده است." } as const;
      const drafts = await tx.journalEntry.count({ where: { organizationId: member.organizationId, fiscalYearId: id, status: "DRAFT" } });
      const financialDrafts = await tx.financialTransaction.count({ where: { organizationId: member.organizationId, fiscalYearId: id, status: "DRAFT" } });
      const invoiceDrafts = await tx.invoice.count({ where: { organizationId: member.organizationId, fiscalYearId: id, status: "DRAFT" } });
      const paymentDrafts = await tx.payment.count({ where: { organizationId: member.organizationId, fiscalYearId: id, status: "DRAFT" } });
      if (drafts > 0 || financialDrafts > 0 || invoiceDrafts > 0 || paymentDrafts > 0) return { status: 409, error: `این سال مالی ${drafts.toLocaleString("fa-IR")} سند، ${financialDrafts.toLocaleString("fa-IR")} درآمد یا هزینه، ${invoiceDrafts.toLocaleString("fa-IR")} فاکتور و ${paymentDrafts.toLocaleString("fa-IR")} دریافت یا پرداخت پیش‌نویس دارد؛ ابتدا وضعیت آن‌ها را تعیین کنید.` } as const;
      await tx.fiscalYear.update({ where: { id }, data: { status: "CLOSED" } });
      await tx.fiscalYearEvent.create({ data: { organizationId: member.organizationId, fiscalYearId: id, actorId: member.userId, actorName: member.userName, type: "CLOSED", details: { previousStatus: "OPEN", status: "CLOSED" } } });
      return { status: 200 } as const;
    });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ status: "CLOSED" });
  } catch (error) {
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    if (isTransactionConflict(error)) return Response.json({ error: "تغییر هم‌زمان رخ داد؛ دوباره تلاش کنید." }, { status: 409 });
    console.error("Fiscal year closing failed", error);
    return Response.json({ error: "بستن سال مالی انجام نشد." }, { status: 500 });
  }
}
