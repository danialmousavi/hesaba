import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activeOrganizationTestEnabled, resolveActiveOrganization } from "@/lib/active-organization";
import { isTransactionConflict } from "@/lib/prisma-errors";

type Role = "ADMIN" | "ACCOUNTANT" | "VIEWER";
export type OrganizationContext = { organizationId: string; role: Role; sessionId?: string; userId: string; userName: string; experimental: boolean };
export class OrganizationContextError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function organizationContext(request: Request, noMembershipStatus: 401 | 403 = 401): Promise<OrganizationContext> {
  if (activeOrganizationTestEnabled()) {
    const result = await resolveActiveOrganization(request.headers);
    if (result.state === "UNAUTHENTICATED") throw new OrganizationContextError(401, "ابتدا وارد حساب شوید.");
    if (result.state === "NO_MEMBERSHIP") throw new OrganizationContextError(403, "دسترسی مجاز نیست.");
    if (result.state !== "ACTIVE") throw new OrganizationContextError(409, "سازمان فعال معتبر نیست؛ سازمان را انتخاب کنید.");
    return { organizationId: result.organizationId, role: result.role, sessionId: result.sessionId, userId: result.userId, userName: result.userName, experimental: true };
  }
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new OrganizationContextError(401, "ابتدا وارد حساب شوید.");
  const member = await prisma.membership.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" }, select: { organizationId: true, role: true } });
  if (!member) throw new OrganizationContextError(noMembershipStatus, "دسترسی مجاز نیست.");
  return { ...member, userId: session.user.id, userName: session.user.name, experimental: false };
}

// Call inside the same transaction as the write. The expected organization is only a precondition.
export async function guardOrganizationWrite(tx: Prisma.TransactionClient, context: OrganizationContext, request: Request, allowedRoles: Role[]) {
  if (!context.experimental) return;
  if (request.headers.get("x-expected-organization-id") !== context.organizationId) throw new OrganizationContextError(409, "سازمان تغییر کرده است؛ صفحه را دوباره بارگذاری کنید.");
  await tx.$queryRaw`SELECT id FROM "Session" WHERE id = ${context.sessionId} AND "userId" = ${context.userId} FOR UPDATE`;
  const session = await tx.session.findFirst({ where: { id: context.sessionId, userId: context.userId, expiresAt: { gt: new Date() } }, select: { activeOrganizationId: true } });
  if (!session || session.activeOrganizationId !== context.organizationId) throw new OrganizationContextError(409, "سازمان تغییر کرده است؛ صفحه را دوباره بارگذاری کنید.");
  await tx.$queryRaw`SELECT id FROM "Membership" WHERE "userId" = ${context.userId} AND "organizationId" = ${context.organizationId} FOR SHARE`;
  const member = await tx.membership.findUnique({ where: { userId_organizationId: { userId: context.userId!, organizationId: context.organizationId } }, select: { role: true } });
  if (!member || !allowedRoles.includes(member.role)) throw new OrganizationContextError(403, "دسترسی مجاز نیست.");
}

// Keep the session and membership stable until the data snapshot has been read.
export async function guardOrganizationRead(tx: Prisma.TransactionClient, context: OrganizationContext) {
  if (!context.experimental) return;
  await tx.$queryRaw`SELECT id FROM "Session" WHERE id = ${context.sessionId} AND "userId" = ${context.userId} FOR SHARE`;
  const session = await tx.session.findFirst({ where: { id: context.sessionId, userId: context.userId, expiresAt: { gt: new Date() } }, select: { activeOrganizationId: true } });
  if (!session || session.activeOrganizationId !== context.organizationId) throw new OrganizationContextError(409, "سازمان تغییر کرده است؛ صفحه را دوباره بارگذاری کنید.");
  await tx.$queryRaw`SELECT id FROM "Membership" WHERE "userId" = ${context.userId} AND "organizationId" = ${context.organizationId} FOR SHARE`;
  const member = await tx.membership.findUnique({ where: { userId_organizationId: { userId: context.userId, organizationId: context.organizationId } }, select: { role: true } });
  if (!member) throw new OrganizationContextError(403, "دسترسی مجاز نیست.");
  if (member.role !== context.role) throw new OrganizationContextError(409, "سطح دسترسی تغییر کرده است؛ دوباره تلاش کنید.");
}

export function organizationContextError(error: unknown) {
  if (error instanceof OrganizationContextError) return Response.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  if (isTransactionConflict(error)) return Response.json({ error: "تغییر هم‌زمان رخ داد؛ دوباره تلاش کنید." }, { status: 409, headers: { "Cache-Control": "no-store" } });
  return null;
}
