import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productFields, updateProductSchema } from "@/lib/product-validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true } });
  if (!member || member.role === "VIEWER") return Response.json({ error: "اجازه تغییر کالا یا خدمت را ندارید." }, { status: 403 });
  const id = z.string().cuid().safeParse((await params).id);
  if (!id.success) return Response.json({ error: "شناسه کالا یا خدمت معتبر نیست." }, { status: 400 });
  const parsed = updateProductSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "اطلاعات معتبر نیست." }, { status: 400 });
  try {
    const product = await prisma.product.update({ where: { organizationId_id: { organizationId: member.organizationId, id: id.data } }, data: parsed.data, select: productFields });
    return Response.json({ product }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return Response.json({ error: "کالا یا خدمت پیدا نشد." }, { status: 404 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ error: "این کد در سازمان شما قبلاً استفاده شده است." }, { status: 409 });
    console.error("Product update failed", error);
    return Response.json({ error: "تغییر کالا یا خدمت انجام نشد." }, { status: 500 });
  }
}
