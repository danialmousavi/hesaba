import "server-only";
import { Prisma } from "@/generated/prisma/client";

export function isTransactionConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === "P2034") return true;
  if (error.code !== "P2010") return false;
  const adapter = error.meta?.driverAdapterError;
  if (!(adapter instanceof Error) || !adapter.cause || typeof adapter.cause !== "object") return false;
  const cause = adapter.cause as { kind?: unknown; originalCode?: unknown };
  return cause.kind === "TransactionWriteConflict" && (cause.originalCode === "40001" || cause.originalCode === "40P01");
}
