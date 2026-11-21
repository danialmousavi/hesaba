import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { partyFields, updatePartySchema } from "@/lib/party-validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true } });
  if (!member || member.role === "VIEWER") return Response.json({ error: "اجازه تغییر اطلاعات شخص را ندارید." }, { status: 403 });
  const id = z.string().cuid().safeParse((await params).id);
  if (!id.success) return Response.json({ error: "شناسه شخص معتبر نیست." }, { status: 400 });
  const parsed = updatePartySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "اطلاعات معتبر نیست." }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const party = await tx.party.findFirst({ where: { id: id.data, organizationId: member.organizationId }, select: { isCustomer: true, isSupplier: true } });
      if (!party) return { error: "شخص پیدا نشد.", status: 404 } as const;
      if (!(parsed.data.isCustomer ?? party.isCustomer) && !(parsed.data.isSupplier ?? party.isSupplier)) {
        return { error: "حداقل یک نقش برای شخص انتخاب کنید.", status: 400 } as const;
      }
      const updated = await tx.party.update({ where: { organizationId_id: { organizationId: member.organizationId, id: id.data } }, data: parsed.data, select: partyFields });
      return { party: updated } as const;
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return Response.json({ error: "تغییر هم‌زمان رخ داد؛ دوباره تلاش کنید." }, { status: 409 });
    console.error("Party update failed", error);
    return Response.json({ error: "تغییر اطلاعات شخص انجام نشد." }, { status: 500 });
  }
}
