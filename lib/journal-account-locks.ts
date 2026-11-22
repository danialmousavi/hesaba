import "server-only";
import type { Prisma } from "@/generated/prisma/client";

// The caller locks the fiscal year (and existing entry, when applicable) first.
export async function lockJournalAccounts(tx: Prisma.TransactionClient, organizationId: string, accountIds: string[]) {
  const ids = [...new Set(accountIds)].sort();
  const initialLinks = await tx.partyAccount.findMany({ where: { organizationId, accountId: { in: ids } }, select: { partyId: true } });
  const partyIds = [...new Set(initialLinks.map((link) => link.partyId))].sort();
  for (const partyId of partyIds) await tx.$queryRaw`SELECT id FROM "Party" WHERE id = ${partyId} AND "organizationId" = ${organizationId} FOR UPDATE`;
  for (const accountId of ids) await tx.$queryRaw`SELECT id FROM "LedgerAccount" WHERE id = ${accountId} AND "organizationId" = ${organizationId} FOR UPDATE`;
  if (await tx.ledgerAccount.count({ where: { id: { in: ids }, organizationId, isActive: true } }) !== ids.length) return null;
  const links = await tx.partyAccount.findMany({ where: { organizationId, accountId: { in: ids } }, select: { partyId: true, party: { select: { isActive: true } } } });
  // A link may have appeared between discovery and the account lock. Retry rather than
  // acquiring a party lock out of order or using an unlocked party's status.
  if (links.some((link) => !partyIds.includes(link.partyId) || !link.party.isActive)) return null;
  return ids;
}

export async function markPartyAccountsUsed(tx: Prisma.TransactionClient, organizationId: string, accountIds: string[]) {
  await tx.partyAccount.updateMany({ where: { organizationId, accountId: { in: accountIds }, firstUsedAt: null }, data: { firstUsedAt: new Date() } });
}
