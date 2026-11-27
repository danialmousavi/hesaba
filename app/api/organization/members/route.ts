import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { activeOrganizationTestEnabled } from "@/lib/active-organization";
import { OrganizationContextError, organizationContext, organizationContextError, type OrganizationContext } from "@/lib/organization-context";

const options = { headers: { "Cache-Control": "private, no-store" } };
const roleSchema = z.enum(["ADMIN", "ACCOUNTANT", "VIEWER"]);
const createSchema = z.strictObject({ email: z.string().trim().email().max(320), role: roleSchema });
const memberFields = { id: true, userId: true, role: true, createdAt: true, updatedAt: true, user: { select: { name: true, email: true } } } as const;

async function lockActiveAdmin(tx: Prisma.TransactionClient, context: OrganizationContext, request: Request) {
  if (context.experimental && request.method !== "GET" && request.headers.get("x-expected-organization-id") !== context.organizationId) throw new OrganizationContextError(409, "سازمان تغییر کرده است؛ صفحه را دوباره بارگذاری کنید.");
  await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${context.organizationId} FOR UPDATE`;
  if (context.experimental) {
    await tx.$queryRaw`SELECT id FROM "Session" WHERE id = ${context.sessionId} AND "userId" = ${context.userId} FOR UPDATE`;
    const session = await tx.session.findFirst({ where: { id: context.sessionId, userId: context.userId, expiresAt: { gt: new Date() } }, select: { activeOrganizationId: true } });
    if (!session || session.activeOrganizationId !== context.organizationId) throw new OrganizationContextError(409, "سازمان تغییر کرده است؛ صفحه را دوباره بارگذاری کنید.");
  }
  await tx.$queryRaw`SELECT id FROM "Membership" WHERE "userId" = ${context.userId} AND "organizationId" = ${context.organizationId} FOR SHARE`;
  const actor = await tx.membership.findUnique({ where: { userId_organizationId: { userId: context.userId, organizationId: context.organizationId } }, select: { role: true } });
  if (!actor || actor.role !== "ADMIN") throw new OrganizationContextError(403, "فقط مدیر سازمان می‌تواند اعضا را مدیریت کند.");
}

function hidden() {
  return Response.json({ error: "مسیر پیدا نشد." }, { ...options, status: 404 });
}

export async function GET(request: Request) {
  if (!activeOrganizationTestEnabled()) return hidden();
  const context = await organizationContext(request).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (context instanceof Error) return organizationContextError(context) ?? Response.json({ error: "دریافت اعضا انجام نشد." }, { ...options, status: 500 });
  try {
    const members = await prisma.$transaction(async (tx) => {
      await lockActiveAdmin(tx, context, request);
      return tx.membership.findMany({ where: { organizationId: context.organizationId }, select: memberFields, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    }, { isolationLevel: "Serializable" });
    return Response.json({ members }, options);
  } catch (error) {
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    console.error("Member list failed", error);
    return Response.json({ error: "دریافت فهرست اعضا انجام نشد." }, { ...options, status: 500 });
  }
}

export async function POST(request: Request) {
  if (!activeOrganizationTestEnabled()) return hidden();
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { ...options, status: 403 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "اطلاعات عضو معتبر نیست." }, { ...options, status: 400 });
  const context = await organizationContext(request).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (context instanceof Error) return organizationContextError(context) ?? Response.json({ error: "افزودن عضو انجام نشد." }, { ...options, status: 500 });
  const email = parsed.data.email.toLocaleLowerCase("en-US");
  try {
    const member = await prisma.$transaction(async (tx) => {
      await lockActiveAdmin(tx, context, request);
      const user = await tx.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
      if (!user) throw new OrganizationContextError(422, "کاربر قابل افزودن نیست.");
      const existing = await tx.membership.findUnique({ where: { userId_organizationId: { userId: user.id, organizationId: context.organizationId } }, select: { id: true } });
      if (existing) throw new OrganizationContextError(409, "این کاربر هم‌اکنون عضو سازمان است.");
      const created = await tx.membership.create({ data: { userId: user.id, organizationId: context.organizationId, role: parsed.data.role }, select: memberFields });
      await tx.membershipEvent.create({ data: { organizationId: context.organizationId, membershipId: created.id, type: "GRANTED", actorId: context.userId, actorName: context.userName, memberUserId: user.id, memberName: user.name, memberEmail: user.email, nextRole: created.role } });
      return created;
    }, { isolationLevel: "Serializable" });
    return Response.json({ member }, { ...options, status: 201 });
  } catch (error) {
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    console.error("Member creation failed", error);
    return Response.json({ error: "افزودن عضو انجام نشد." }, { ...options, status: 500 });
  }
}
