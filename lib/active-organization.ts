import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Temporary test-only gate: selection must not be exposed while legacy paths use first membership.
export function activeOrganizationTestEnabled() {
  if (process.env.HESABA_ACTIVE_ORGANIZATION_TEST_ONLY !== "1") return false;
  try { return /^hesaba_(?:test|invoice_test)_[a-f0-9]{16}$/.test(new URL(process.env.DATABASE_URL ?? "").pathname.slice(1)); }
  catch { return false; }
}

export async function resolveActiveOrganization(headers: Headers) {
  const authSession = await auth.api.getSession({ headers });
  if (!authSession) return { state: "UNAUTHENTICATED" } as const;
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Session" WHERE id = ${authSession.session.id} AND "userId" = ${authSession.user.id} FOR UPDATE`;
    const session = await tx.session.findFirst({ where: { id: authSession.session.id, userId: authSession.user.id, expiresAt: { gt: new Date() } }, select: { id: true, activeOrganizationId: true } });
    if (!session) return { state: "UNAUTHENTICATED" } as const;
    const memberships = await tx.membership.findMany({ where: { userId: authSession.user.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { organizationId: true, role: true, organization: { select: { id: true, name: true, slug: true } } } });
    if (session.activeOrganizationId) {
      const selected = memberships.find((membership) => membership.organizationId === session.activeOrganizationId);
      if (!selected) return { state: "MEMBERSHIP_REVOKED", memberships } as const;
      return { state: "ACTIVE", sessionId: session.id, userId: authSession.user.id, userName: authSession.user.name, ...selected, memberships } as const;
    }
    if (memberships.length === 0) return { state: "NO_MEMBERSHIP", memberships } as const;
    if (memberships.length !== 1) return { state: "SELECTION_REQUIRED", memberships } as const;
    await tx.session.update({ where: { id: session.id }, data: { activeOrganizationId: memberships[0].organizationId } });
    return { state: "ACTIVE", sessionId: session.id, userId: authSession.user.id, userName: authSession.user.name, ...memberships[0], memberships } as const;
  }, { isolationLevel: "Serializable" });
}

export async function selectActiveOrganization(headers: Headers, organizationId: string) {
  const authSession = await auth.api.getSession({ headers });
  if (!authSession) return { state: "UNAUTHENTICATED" } as const;
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Session" WHERE id = ${authSession.session.id} AND "userId" = ${authSession.user.id} FOR UPDATE`;
    const session = await tx.session.findFirst({ where: { id: authSession.session.id, userId: authSession.user.id, expiresAt: { gt: new Date() } }, select: { id: true } });
    if (!session) return { state: "UNAUTHENTICATED" } as const;
    await tx.$queryRaw`SELECT id FROM "Membership" WHERE "userId" = ${authSession.user.id} AND "organizationId" = ${organizationId} FOR SHARE`;
    const member = await tx.membership.findUnique({ where: { userId_organizationId: { userId: authSession.user.id, organizationId } }, select: { organizationId: true, role: true, organization: { select: { id: true, name: true, slug: true } } } });
    if (!member) return { state: "FORBIDDEN" } as const;
    await tx.session.update({ where: { id: session.id }, data: { activeOrganizationId: member.organizationId } });
    return { state: "ACTIVE", ...member } as const;
  }, { isolationLevel: "Serializable" });
}
