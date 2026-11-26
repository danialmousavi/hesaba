import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { partyFields, updatePartySchema } from "@/lib/party-validation";
import { guardOrganizationWrite, organizationContext, organizationContextError } from "@/lib/organization-context";
import { isTransactionConflict } from "@/lib/prisma-errors";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const member = await organizationContext(request).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  if (member.role === "VIEWER") return Response.json({ error: "اجازه تغییر اطلاعات شخص را ندارید." }, { status: 403 });
  const id = z.string().cuid().safeParse((await params).id);
  if (!id.success) return Response.json({ error: "شناسه شخص معتبر نیست." }, { status: 400 });
  const parsed = updatePartySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "اطلاعات معتبر نیست." }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      await guardOrganizationWrite(tx, member, request, ["ADMIN", "ACCOUNTANT"]);
      await tx.$queryRaw`SELECT id FROM "Party" WHERE id = ${id.data} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const party = await tx.party.findFirst({ where: { id: id.data, organizationId: member.organizationId }, select: { isCustomer: true, isSupplier: true } });
      if (!party) return { error: "شخص پیدا نشد.", status: 404 } as const;
      if (!(parsed.data.isCustomer ?? party.isCustomer) && !(parsed.data.isSupplier ?? party.isSupplier)) {
        return { error: "حداقل یک نقش برای شخص انتخاب کنید.", status: 400 } as const;
      }
      if (parsed.data.isCustomer === false || parsed.data.isSupplier === false) {
        const links = await tx.partyAccount.findMany({ where: { organizationId: member.organizationId, partyId: id.data }, select: { purpose: true } });
        if (links.some((link) => (link.purpose === "RECEIVABLE" && parsed.data.isCustomer === false) || (link.purpose === "PAYABLE" && parsed.data.isSupplier === false))) return { error: "ابتدا اتصال حساب مربوط به این نقش را تعیین تکلیف کنید.", status: 409 } as const;
      }
      const updated = await tx.party.update({ where: { organizationId_id: { organizationId: member.organizationId, id: id.data } }, data: parsed.data, select: partyFields });
      return { party: updated } as const;
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    if (isTransactionConflict(error)) return Response.json({ error: "تغییر هم‌زمان رخ داد؛ دوباره تلاش کنید." }, { status: 409 });
    console.error("Party update failed", error);
    return Response.json({ error: "تغییر اطلاعات شخص انجام نشد." }, { status: 500 });
  }
}
