import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { activeOrganizationTestEnabled } from "@/lib/active-organization";
import { OrganizationContextError, organizationContext, organizationContextError, type OrganizationContext } from "@/lib/organization-context";

const options = { headers: { "Cache-Control": "private, no-store" } };
const roleSchema = z.strictObject({ role: z.enum(["ADMIN", "ACCOUNTANT", "VIEWER"]) });
const memberFields = { id: true, userId: true, role: true, createdAt: true, updatedAt: true, user: { select: { name: true, email: true } } } as const;

function hidden() {
  return Response.json({ error: "مسیر پیدا نشد." }, { ...options, status: 404 });
}

async function lockActiveAdmin(tx: Prisma.TransactionClient, context: OrganizationContext, request: Request) {
  if (context.experimental && request.headers.get("x-expected-organization-id") !== context.organizationId) throw new OrganizationContextError(409, "سازمان تغییر کرده است؛ صفحه را دوباره بارگذاری کنید.");
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

export async function PATCH(request: Request, context: { params: Promise<{ membershipId: string }> }) {
  if (!activeOrganizationTestEnabled()) return hidden();
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { ...options, status: 403 });
  const parsed = roleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "نقش عضو معتبر نیست." }, { ...options, status: 400 });
  const { membershipId } = await context.params;
  if (!z.string().cuid().safeParse(membershipId).success) return Response.json({ error: "عضو پیدا نشد." }, { ...options, status: 404 });
  const member = await organizationContext(request).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "تغییر نقش انجام نشد." }, { ...options, status: 500 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      await lockActiveAdmin(tx, member, request);
      await tx.$queryRaw`SELECT id FROM "Membership" WHERE id = ${membershipId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const target = await tx.membership.findFirst({ where: { id: membershipId, organizationId: member.organizationId }, select: memberFields });
      if (!target) throw new OrganizationContextError(404, "عضو پیدا نشد.");
      if (target.role === parsed.data.role) return { member: target, unchanged: true };
      if (target.role === "ADMIN" && parsed.data.role !== "ADMIN") {
        const admins = await tx.membership.count({ where: { organizationId: member.organizationId, role: "ADMIN" } });
        if (admins <= 1) throw new OrganizationContextError(409, "آخرین مدیر سازمان را نمی‌توان تغییر نقش داد.");
      }
      const updated = await tx.membership.update({ where: { id: target.id }, data: { role: parsed.data.role }, select: memberFields });
      await tx.membershipEvent.create({ data: { organizationId: member.organizationId, membershipId: updated.id, type: "ROLE_CHANGED", actorId: member.userId, actorName: member.userName, memberUserId: updated.userId, memberName: updated.user.name, memberEmail: updated.user.email, previousRole: target.role, nextRole: updated.role } });
      return { member: updated, unchanged: false };
    }, { isolationLevel: "Serializable" });
    return Response.json(result, options);
  } catch (error) {
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    console.error("Membership role change failed", error);
    return Response.json({ error: "تغییر نقش عضو انجام نشد." }, { ...options, status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ membershipId: string }> }) {
  if (!activeOrganizationTestEnabled()) return hidden();
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "مبدأ درخواست معتبر نیست." }, { ...options, status: 403 });
  const { membershipId } = await context.params;
  if (!z.string().cuid().safeParse(membershipId).success) return Response.json({ error: "عضو پیدا نشد." }, { ...options, status: 404 });
  const member = await organizationContext(request).catch((error: unknown) => error instanceof Error ? error : new Error("Organization resolution failed"));
  if (member instanceof Error) return organizationContextError(member) ?? Response.json({ error: "حذف دسترسی انجام نشد." }, { ...options, status: 500 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      await lockActiveAdmin(tx, member, request);
      await tx.$queryRaw`SELECT id FROM "Membership" WHERE id = ${membershipId} AND "organizationId" = ${member.organizationId} FOR UPDATE`;
      const target = await tx.membership.findFirst({ where: { id: membershipId, organizationId: member.organizationId }, select: memberFields });
      if (!target) throw new OrganizationContextError(404, "عضو پیدا نشد.");
      if (target.role === "ADMIN") {
        const admins = await tx.membership.count({ where: { organizationId: member.organizationId, role: "ADMIN" } });
        if (admins <= 1) throw new OrganizationContextError(409, "آخرین مدیر سازمان را نمی‌توان حذف کرد.");
      }
      await tx.membership.delete({ where: { id: target.id } });
      await tx.membershipEvent.create({ data: { organizationId: member.organizationId, membershipId: target.id, type: "REVOKED", actorId: member.userId, actorName: member.userName, memberUserId: target.userId, memberName: target.user.name, memberEmail: target.user.email, previousRole: target.role } });
      return { membershipId: target.id };
    }, { isolationLevel: "Serializable" });
    return Response.json(result, options);
  } catch (error) {
    const contextError = organizationContextError(error);
    if (contextError) return contextError;
    console.error("Membership removal failed", error);
    return Response.json({ error: "حذف دسترسی عضو انجام نشد." }, { ...options, status: 500 });
  }
}
