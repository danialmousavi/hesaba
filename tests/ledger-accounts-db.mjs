import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  const organizationId = randomUUID();
  const rootId = randomUUID();
  const childId = randomUUID();
  await client.query('INSERT INTO "Organization" (id, name, slug, "updatedAt") VALUES ($1, $2, $3, now())', [organizationId, "Ledger test", organizationId]);
  const insert = 'INSERT INTO "LedgerAccount" (id, "organizationId", "parentId", code, name, type, "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, now())';
  await client.query(insert, [rootId, organizationId, null, "100", "دارایی", "ASSET"]);
  await client.query(insert, [childId, organizationId, rootId, "110", "بانک", "ASSET"]);
  await client.query("SAVEPOINT duplicate_code");
  await assert.rejects(client.query(insert, [randomUUID(), organizationId, null, "100", "تکراری", "ASSET"]), { code: "23505" });
  await client.query("ROLLBACK TO SAVEPOINT duplicate_code");
  await client.query("SAVEPOINT own_parent");
  await assert.rejects(client.query('UPDATE "LedgerAccount" SET "parentId" = id WHERE id = $1', [rootId]), { code: "23514" });
  await client.query("ROLLBACK TO SAVEPOINT own_parent");
  await client.query("SAVEPOINT delete_parent");
  await assert.rejects(client.query('DELETE FROM "LedgerAccount" WHERE id = $1', [rootId]), { code: "23503" });
  await client.query("ROLLBACK TO SAVEPOINT delete_parent");
  console.log("Ledger account database constraints passed.");
} finally {
  await client.query("ROLLBACK");
  await client.end();
}
