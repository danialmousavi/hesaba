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
  const schema = `invoice_test_${randomBytes(8).toString("hex")}`;
  await db.query(`CREATE SCHEMA "${schema}"`);
  await db.query(`SET LOCAL search_path TO "${schema}"`);
  await db.query(`
    CREATE TYPE "ProductType" AS ENUM ('GOODS', 'SERVICE');
    CREATE TABLE "Organization" (id text PRIMARY KEY);
    CREATE TABLE "FiscalYear" (id text PRIMARY KEY, "organizationId" text NOT NULL, UNIQUE ("organizationId", id));
    CREATE TABLE "Party" (id text PRIMARY KEY, "organizationId" text NOT NULL, name text NOT NULL, UNIQUE ("organizationId", id));
    CREATE TABLE "Product" (id text PRIMARY KEY, "organizationId" text NOT NULL, name text NOT NULL, UNIQUE ("organizationId", id));
  `);
  const migration = await readFile(new URL("../prisma/migrations/20261123100000_add_invoice_drafts/migration.sql", import.meta.url), "utf8");
  await db.query(migration);
  await db.query(`
    INSERT INTO "Organization" VALUES ('org1'), ('org2');
    INSERT INTO "FiscalYear" VALUES ('year1', 'org1'), ('year2', 'org2');
    INSERT INTO "Party" VALUES ('party1', 'org1', 'Original customer'), ('party2', 'org2', 'Other customer');
    INSERT INTO "Product" VALUES ('product1', 'org1', 'Original product'), ('product2', 'org2', 'Other product');
  `);
  const invoice = `INSERT INTO "Invoice" (id,"organizationId","fiscalYearId","customerId","customerName",date,"updatedAt") VALUES ($1,$2,$3,$4,$5,'2026-01-01',now())`;
  const line = `INSERT INTO "InvoiceLine" (id,"organizationId","invoiceId","productId",position,"productCode","productName","productType",unit,quantity,"unitPrice","discountAmount","taxAmount") VALUES ($1,$2,$3,$4,$5,'P1','Original product','GOODS','unit',$6,$7,$8,$9)`;
  async function rejects(sql, values, code) {
    await db.query("SAVEPOINT invalid_input");
    await assert.rejects(db.query(sql, values), { code });
    await db.query("ROLLBACK TO SAVEPOINT invalid_input");
  }
  await db.query(invoice, ["i1", "org1", "year1", "party1", "Original customer"]);
  await db.query(line, ["l1", "org1", "i1", "product1", 1, "1.250", "99999999999999999999", "0", "0"]);
  await rejects(invoice, ["i2", "org1", "year2", "party1", "Customer"], "23503");
  await rejects(invoice, ["i2", "org1", "year1", "party2", "Customer"], "23503");
  await rejects(invoice, ["i2", "org1", "year1", "party1", "  "], "23514");
  await rejects(line, ["l2", "org1", "i1", "product2", 2, "1", "1", "0", "0"], "23503");
  await rejects(line, ["l2", "org2", "i1", "product2", 2, "1", "1", "0", "0"], "23503");
  await rejects(line, ["l2", "org1", "i1", "product1", 1, "1", "1", "0", "0"], "23505");
  await rejects(line, ["l2", "org1", "i1", "product1", 2, "0", "1", "0", "0"], "23514");
  await rejects(line, ["l2", "org1", "i1", "product1", 2, "1", "-1", "0", "0"], "23514");
  await rejects(line, ["l2", "org1", "i1", "product1", 2, "1", "1", "-1", "0"], "23514");
  await rejects(line, ["l2", "org1", "i1", "product1", 2, "1", "1", "0", "-1"], "23514");
  await db.query(`UPDATE "Party" SET name='Changed' WHERE id='party1'; UPDATE "Product" SET name='Changed' WHERE id='product1'`);
  const result = await db.query(`SELECT i."customerName", l."productName", l.quantity::text, l."unitPrice"::text FROM "Invoice" i JOIN "InvoiceLine" l ON l."invoiceId"=i.id WHERE i.id='i1'`);
  assert.deepEqual(result.rows[0], { customerName: "Original customer", productName: "Original product", quantity: "1.250", unitPrice: "99999999999999999999" });
  await db.query(`DELETE FROM "Invoice" WHERE id='i1'`);
  assert.equal((await db.query(`SELECT count(*)::int AS count FROM "InvoiceLine"`)).rows[0].count, 0);
  console.log("Invoice migration and constraints passed.");
} finally {
  await db.query("ROLLBACK");
  await db.end();
}
