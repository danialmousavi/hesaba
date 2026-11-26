import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { guardOrganizationWrite, organizationContext, organizationContextError } from "@/lib/organization-context";
import { isTransactionConflict } from "@/lib/prisma-errors";

const schema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  code: z.string().trim().regex(/^\d{1,20}$/).optional(),
  isActive: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const member = await organizationContext(request).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  if (member.role !== "ADMIN") return Response.json({ error: "فقط مدیر سازمان می‌تواند حساب را تغییر دهد." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "اطلاعات واردشده معتبر نیست." }, { status: 400 });
  const { id } = await params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      await guardOrganizationWrite(tx, member, request, ["ADMIN"]);
      await tx.$queryRaw`SELECT id FROM "LedgerAccount" WHERE id = ${id} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const account = await tx.ledgerAccount.findFirst({ where: { id, organizationId: member.organizationId }, select: { id: true, parentId: true } });
      if (!account) return { error: "حساب پیدا نشد.", status: 404 } as const;
      if (parsed.data.isActive === false) {
        if (await tx.partyAccount.findFirst({ where: { organizationId: member.organizationId, accountId: id }, select: { id: true } })) return { error: "حساب متصل به شخص قابل غیرفعال‌کردن نیست." , status: 409 } as const;
        const children = await tx.ledgerAccount.findFirst({ where: { parentId: id, organizationId: member.organizationId, isActive: true }, select: { id: true } });
        if (children) return { error: "ابتدا زیرحساب‌های فعال را غیرفعال کنید.", status: 409 } as const;
      }
      if (parsed.data.isActive === true && account.parentId) {
        const parent = await tx.ledgerAccount.findFirst({ where: { id: account.parentId, organizationId: member.organizationId, isActive: true }, select: { id: true } });
        if (!parent) return { error: "ابتدا حساب والد را فعال کنید.", status: 409 } as const;
      }
      const updated = await tx.ledgerAccount.update({ where: { id }, data: parsed.data, select: { id: true, code: true, name: true, type: true, parentId: true, isActive: true } });
      return { account: updated } as const;
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result);
  } catch (error) {
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ error: "این کد حساب قبلاً استفاده شده است." }, { status: 409 });
    if (isTransactionConflict(error)) return Response.json({ error: "تغییر هم‌زمان رخ داد؛ دوباره تلاش کنید." }, { status: 409 });
    console.error("Ledger account update failed", error);
    return Response.json({ error: "تغییر حساب انجام نشد." }, { status: 500 });
  }
}
