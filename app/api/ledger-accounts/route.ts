import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { guardOrganizationRead, guardOrganizationWrite, organizationContext, organizationContextError } from "@/lib/organization-context";
import { isTransactionConflict } from "@/lib/prisma-errors";

const inputSchema = z.object({
  code: z.string().trim().regex(/^\d{1,20}$/, "کد حساب باید فقط شامل ۱ تا ۲۰ رقم باشد."),
  name: z.string().trim().min(2, "نام حساب باید حداقل ۲ کاراکتر باشد.").max(100),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
  parentId: z.string().cuid().nullable().optional(),
});

export async function GET(request: Request) {
  const member = await organizationContext(request).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  try {
    const accounts = await prisma.$transaction(async (tx) => {
      await guardOrganizationRead(tx, member);
      return tx.ledgerAccount.findMany({ where: { organizationId: member.organizationId }, orderBy: { code: "asc" }, select: { id: true, parentId: true, code: true, name: true, type: true, isActive: true } });
    }, { isolationLevel: "RepeatableRead" });
    return Response.json({ accounts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return organizationContextError(error) ?? Response.json({ error: "دریافت حساب‌ها انجام نشد." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  }
  const member = await organizationContext(request).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "دریافت سازمان انجام نشد." }, { status: 500 });
  if (member.role !== "ADMIN") {
    return Response.json({ error: "فقط مدیر سازمان می‌تواند حساب ایجاد کند." }, { status: 403 });
  }
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "اطلاعات معتبر نیست." }, { status: 400 });

  const parentId = parsed.data.parentId ?? null;
  try {
    const account = await prisma.$transaction(async (tx) => {
      await guardOrganizationWrite(tx, member, request, ["ADMIN"]);
      if (parentId) {
        await tx.$queryRaw`SELECT id FROM "LedgerAccount" WHERE id = ${parentId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
        const parent = await tx.ledgerAccount.findFirst({ where: { id: parentId, organizationId: member.organizationId }, select: { type: true, isActive: true } });
        if (!parent || !parent.isActive || parent.type !== parsed.data.type) return null;
        if (await tx.partyAccount.findFirst({ where: { organizationId: member.organizationId, accountId: parentId }, select: { id: true } })) return null;
      }
      return tx.ledgerAccount.create({ data: { organizationId: member.organizationId, parentId, code: parsed.data.code, name: parsed.data.name, type: parsed.data.type }, select: { id: true, parentId: true, code: true, name: true, type: true, isActive: true } });
    }, { isolationLevel: "Serializable" });
    if (!account) return Response.json({ error: "حساب والد باید فعال، هم‌نوع و متعلق به سازمان شما باشد و به شخصی اختصاص نیافته باشد." }, { status: 400 });
    return Response.json({ account }, { status: 201 });
  } catch (error) {
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "این کد حساب در سازمان شما قبلاً استفاده شده است." }, { status: 409 });
    }
    if (isTransactionConflict(error)) return Response.json({ error: "تغییر هم‌زمان رخ داد؛ دوباره تلاش کنید." }, { status: 409 });
    console.error("Ledger account creation failed", error);
    return Response.json({ error: "ایجاد حساب انجام نشد." }, { status: 500 });
  }
}
