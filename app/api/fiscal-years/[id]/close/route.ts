import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  }
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await prisma.membership.findFirst({
    where: { userId: session.user.id }, orderBy: { createdAt: "asc" },
    select: { organizationId: true, role: true },
  });
  if (!member || member.role !== "ADMIN") {
    return Response.json({ error: "فقط مدیر سازمان می‌تواند سال مالی را ببندد." }, { status: 403 });
  }
  const { id } = await params;
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.fiscalYear.updateMany({
        where: { id, organizationId: member.organizationId, status: "OPEN" },
        data: { status: "CLOSED" },
      });
      if (result.count === 1) await tx.fiscalYearEvent.create({ data: { organizationId: member.organizationId, fiscalYearId: id, actorId: session.user.id, actorName: session.user.name, type: "CLOSED", details: { previousStatus: "OPEN", status: "CLOSED" } } });
      return result;
    });
    if (updated.count === 1) return Response.json({ status: "CLOSED" });
    const year = await prisma.fiscalYear.findFirst({ where: { id, organizationId: member.organizationId }, select: { id: true } });
    return year
      ? Response.json({ error: "این سال مالی قبلاً بسته شده است." }, { status: 409 })
      : Response.json({ error: "سال مالی پیدا نشد." }, { status: 404 });
  } catch (error) {
    console.error("Fiscal year closing failed", error);
    return Response.json({ error: "بستن سال مالی انجام نشد." }, { status: 500 });
  }
}
