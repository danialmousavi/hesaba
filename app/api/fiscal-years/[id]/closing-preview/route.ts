import { z } from "zod";
import { auth } from "@/lib/auth";
import { buildClosingPreview, closingInputSchema } from "@/lib/fiscal-close-preview";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true } });
  if (!member) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 403 });
  const id = z.string().cuid().safeParse((await params).id);
  const input = closingInputSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !input.success) return Response.json({ error: "اطلاعات پیش‌نمایش معتبر نیست." }, { status: 400 });
  try {
    const result = await prisma.$transaction((tx) => buildClosingPreview(tx, member.organizationId, id.data, input.data), { isolationLevel: "RepeatableRead" });
    if (!result) return Response.json({ error: "سال مالی پیدا نشد." }, { status: 404 });
    return Response.json({ ...result, canConfirm: member.role === "ADMIN" && result.blockers.length === 0, previewOnly: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Fiscal closing preview failed", error);
    return Response.json({ error: "محاسبه پیش‌نمایش اختتامیه انجام نشد." }, { status: 500 });
  }
}
