import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

// A dev server can retain an older client after `prisma generate` adds a model.
const cachedPrisma = globalForPrisma.prisma;
export const prisma = cachedPrisma && "fiscalYearEvent" in cachedPrisma && "ledgerAccount" in cachedPrisma
  ? cachedPrisma
  : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
