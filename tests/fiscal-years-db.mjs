import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  const org = randomUUID();
  await client.query('INSERT INTO "Organization" (id, name, slug, "updatedAt") VALUES ($1, $2, $3, now())', [org, "Test", org]);
  const insert = 'INSERT INTO "FiscalYear" (id, "organizationId", name, "startDate", "endDate", "updatedAt") VALUES ($1, $2, $3, $4, $5, now())';
  await client.query(insert, [randomUUID(), org, "First", "2026-01-01", "2026-12-31"]);
  await client.query("SAVEPOINT before_duplicate");
  await assert.rejects(client.query(insert, [randomUUID(), org, "Second", "2027-01-01", "2027-12-31"]), { code: "23505" });
  await client.query("ROLLBACK TO SAVEPOINT before_duplicate");
  await client.query('UPDATE "FiscalYear" SET status = $1 WHERE "organizationId" = $2', ["CLOSED", org]);
  await client.query("SAVEPOINT before_overlap");
  await assert.rejects(client.query(insert, [randomUUID(), org, "Overlap", "2026-12-31", "2027-12-31"]), { code: "23P01" });
  await client.query("ROLLBACK TO SAVEPOINT before_overlap");
  await client.query("SAVEPOINT before_invalid_date");
  await assert.rejects(client.query(insert, [randomUUID(), org, "Invalid", "2027-12-31", "2027-01-01"]), { code: "23514" });
  await client.query("ROLLBACK TO SAVEPOINT before_invalid_date");
  await client.query(insert, [randomUUID(), org, "Second", "2027-01-01", "2027-12-31"]);
  console.log("Fiscal year database constraints passed.");
} finally {
  await client.query("ROLLBACK");
  await client.end();
}
