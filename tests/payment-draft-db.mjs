import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local", quiet: true });
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  await db.query("BEGIN");
  const schema = `payment_test_${randomBytes(8).toString("hex")}`;
  await db.query(`CREATE SCHEMA "${schema}"`);
  await db.query(`SET LOCAL search_path TO "${schema}"`);
  await db.query(`
    CREATE TYPE "FinancialPaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'OTHER');
    CREATE TABLE "Organization" (id text PRIMARY KEY);
    CREATE TABLE "FiscalYear" (id text PRIMARY KEY, "organizationId" text NOT NULL, UNIQUE ("organizationId", id));
    CREATE TABLE "Party" (id text PRIMARY KEY, "organizationId" text NOT NULL, UNIQUE ("organizationId", id));
    CREATE TABLE "LedgerAccount" (id text PRIMARY KEY, "organizationId" text NOT NULL, UNIQUE ("organizationId", id));
    CREATE TABLE "Invoice" (id text PRIMARY KEY, "organizationId" text NOT NULL, "customerId" text NOT NULL);
  `);
  await db.query(await readFile(new URL("../prisma/migrations/20261124180000_add_payment_drafts/migration.sql", import.meta.url), "utf8"));
  await db.query(`
    INSERT INTO "Organization" VALUES ('org1'), ('org2');
    INSERT INTO "FiscalYear" VALUES ('year1', 'org1'), ('year2', 'org2');
    INSERT INTO "Party" VALUES ('party1', 'org1'), ('party2', 'org1'), ('party3', 'org2');
    INSERT INTO "LedgerAccount" VALUES ('account1', 'org1'), ('account2', 'org2');
    INSERT INTO "Invoice" VALUES ('invoice1', 'org1', 'party1'), ('invoice2', 'org1', 'party2'), ('invoice3', 'org2', 'party3');
  `);
  const payment = `INSERT INTO "Payment" (id,"organizationId","fiscalYearId","partyId",type,date,amount,method,"settlementAccountId","updatedAt") VALUES ($1,$2,$3,$4,$5,'2026-01-01',$6,'CASH',$7,now())`;
  const allocation = `INSERT INTO "PaymentAllocation" (id,"organizationId","partyId","paymentId","paymentType","invoiceId",amount) VALUES ($1,$2,$3,$4,$5,$6,$7)`;
  async function rejects(sql, values, code) {
    await db.query("SAVEPOINT invalid_input");
    await assert.rejects(db.query(sql, values), { code });
    await db.query("ROLLBACK TO SAVEPOINT invalid_input");
  }
  await db.query(payment, ["p1", "org1", "year1", "party1", "RECEIPT", "99999999999999999999", "account1"]);
  await db.query(payment, ["p2", "org1", "year1", "party1", "PAYMENT", "100", "account1"]);
  await db.query(allocation, ["a1", "org1", "party1", "p1", "RECEIPT", "invoice1", "100"]);
  await rejects(payment, ["p3", "org1", "year2", "party1", "RECEIPT", "1", "account1"], "23503");
  await rejects(payment, ["p3", "org1", "year1", "party3", "RECEIPT", "1", "account1"], "23503");
  await rejects(payment, ["p3", "org1", "year1", "party1", "RECEIPT", "1", "account2"], "23503");
  await rejects(payment, ["p3", "org1", "year1", "party1", "RECEIPT", "0", "account1"], "23514");
  await rejects(payment, ["p3", "org1", "year1", "party1", "PAYMENT", "-1", "account1"], "23514");
  await rejects(allocation, ["a2", "org1", "party1", "p1", "RECEIPT", "invoice2", "1"], "23503");
  await rejects(allocation, ["a2", "org1", "party1", "p1", "RECEIPT", "invoice3", "1"], "23503");
  await rejects(allocation, ["a2", "org1", "party2", "p1", "RECEIPT", "invoice2", "1"], "23503");
  await rejects(allocation, ["a2", "org1", "party1", "p2", "RECEIPT", "invoice1", "1"], "23503");
  await rejects(allocation, ["a2", "org1", "party1", "p2", "PAYMENT", "invoice1", "1"], "23514");
  await rejects(allocation, ["a2", "org1", "party1", "p1", "RECEIPT", "invoice1", "1"], "23505");
  await rejects(allocation, ["a2", "org1", "party1", "p1", "RECEIPT", "invoice1", "0"], "23514");
  await rejects('UPDATE "Payment" SET type=\'PAYMENT\' WHERE id=$1', ["p1"], "23503");
  await rejects('DELETE FROM "Invoice" WHERE id=$1', ["invoice1"], "23503");
  const saved = await db.query('SELECT amount::text,status FROM "Payment" WHERE id=$1', ["p1"]);
  assert.deepEqual(saved.rows[0], { amount: "99999999999999999999", status: "DRAFT" });
  await db.query('DELETE FROM "Payment" WHERE id=$1', ["p1"]);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM "PaymentAllocation"')).rows[0].count, 0);
  console.log("Payment migration and constraints passed.");
} finally {
  await db.query("ROLLBACK");
  await db.end();
}
