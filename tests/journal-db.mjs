import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  await db.query("BEGIN");
  const [org, other, year, account, foreignAccount, entry] = Array.from({ length: 6 }, () => randomUUID());
  for (const id of [org, other]) await db.query('INSERT INTO "Organization" (id, name, slug, "updatedAt") VALUES ($1, $2, $1, now())', [id, "Test"]);
  await db.query('INSERT INTO "FiscalYear" (id, "organizationId", name, "startDate", "endDate", "updatedAt") VALUES ($1, $2, $3, $4, $5, now())', [year, org, "Test", "2026-01-01", "2026-12-31"]);
  for (const [id, organizationId] of [[account, org], [foreignAccount, other]]) await db.query('INSERT INTO "LedgerAccount" (id, "organizationId", code, name, type, "updatedAt") VALUES ($1, $2, $3, $4, $5, now())', [id, organizationId, "100", "Test", "ASSET"]);
  await db.query('INSERT INTO "JournalEntry" (id, "organizationId", "fiscalYearId", number, date, description, "updatedAt") VALUES ($1, $2, $3, 1, $4, $5, now())', [entry, org, year, "2026-01-01", "Test"]);
  const line = 'INSERT INTO "JournalLine" (id, "organizationId", "entryId", "accountId", debit, credit) VALUES ($1, $2, $3, $4, $5, $6)';
  await db.query(line, [randomUUID(), org, entry, account, 100, 0]);
  await db.query("SAVEPOINT invalid_amount");
  await assert.rejects(db.query(line, [randomUUID(), org, entry, account, 100, 100]), { code: "23514" });
  await db.query("ROLLBACK TO SAVEPOINT invalid_amount");
  await db.query("SAVEPOINT foreign_account");
  await assert.rejects(db.query(line, [randomUUID(), org, entry, foreignAccount, 0, 100]), { code: "23503" });
  await db.query("ROLLBACK TO SAVEPOINT foreign_account");
  await db.query(line, [randomUUID(), org, entry, account, 0, 100]);
  await db.query('UPDATE "JournalEntry" SET status=$1 WHERE id=$2', ["POSTED", entry]);
  for (const [name, sql, params] of [
    ["entry_update", 'UPDATE "JournalEntry" SET description=$1 WHERE id=$2', ["changed", entry]],
    ["entry_delete", 'DELETE FROM "JournalEntry" WHERE id=$1', [entry]],
    ["line_insert", line, [randomUUID(), org, entry, account, 100, 0]],
    ["line_update", 'UPDATE "JournalLine" SET description=$1 WHERE "entryId"=$2', ["changed", entry]],
    ["line_delete", 'DELETE FROM "JournalLine" WHERE "entryId"=$1', [entry]],
  ]) {
    await db.query(`SAVEPOINT ${name}`);
    await assert.rejects(db.query(sql, params), { code: "23514" });
    await db.query(`ROLLBACK TO SAVEPOINT ${name}`);
  }
  console.log("Journal database constraints passed.");
} finally {
  await db.query("ROLLBACK");
  await db.end();
}
