import "server-only";

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaHash: string | undefined;
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

// Development hot reload keeps globalThis alive even when the Prisma schema changes.
// A fingerprint also catches changes to existing models, not just newly added models.
const schemaHash = process.env.NODE_ENV === "production"
  ? undefined
  : createHash("sha256")
      .update(readFileSync(join(process.cwd(), "prisma", "schema.prisma")))
      .update(readFileSync(join(process.cwd(), "generated", "prisma", "internal", "class.ts")))
      .digest("hex");
const cachedPrisma = globalForPrisma.prisma;
export const prisma = cachedPrisma && globalForPrisma.prismaSchemaHash === schemaHash && "party" in cachedPrisma && "product" in cachedPrisma
  ? cachedPrisma
  : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaHash = schemaHash;
}
