import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { lockJournalAccounts } from "@/lib/journal-account-locks";

export async function lockFinancialAccounts(tx: Prisma.TransactionClient, organizationId: string, type: "INCOME" | "EXPENSE", categoryAccountId: string, settlementAccountId: string) {
  if (categoryAccountId === settlementAccountId) return null;
  const ids = await lockJournalAccounts(tx, organizationId, [categoryAccountId, settlementAccountId]);
  if (!ids) return null;
  const accounts = await tx.ledgerAccount.findMany({ where: { organizationId, id: { in: ids } }, select: { id: true, type: true } });
  const category = accounts.find((account) => account.id === categoryAccountId);
  const settlement = accounts.find((account) => account.id === settlementAccountId);
  if (category?.type !== (type === "INCOME" ? "REVENUE" : "EXPENSE") || settlement?.type !== "ASSET") return null;
  if (await tx.ledgerAccount.findFirst({ where: { organizationId, parentId: { in: ids } }, select: { id: true } })) return null;
  if (await tx.partyAccount.findFirst({ where: { organizationId, accountId: settlementAccountId }, select: { id: true } })) return null;
  return ids;
}
