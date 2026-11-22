import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local", quiet: true });
const target = process.argv[2];
if (!target || process.argv.length !== 3) throw new Error("Provide the test organization ID.");
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const id = () => `c${randomUUID().replaceAll("-", "")}`;
const oldPrefix = "نمونه دمو | ";
const oldLegacy = "نمونه | ";

await db.connect();
try {
  await db.query("BEGIN");
  const organization = await db.query('SELECT name FROM "Organization" WHERE id=$1 FOR UPDATE', [target]);
  if (organization.rowCount !== 1 || organization.rows[0].name !== "test") throw new Error("Only the selected organization named test is allowed.");
  const actor = await db.query('SELECT u.id,u.name FROM "Membership" m JOIN "User" u ON u.id=m."userId" WHERE m."organizationId"=$1 AND m.role=$2 ORDER BY m."createdAt" LIMIT 1', [target, "ADMIN"]);
  if (actor.rowCount !== 1) throw new Error("Organization administrator not found.");
  await db.query('LOCK TABLE "JournalEntry" IN ACCESS EXCLUSIVE MODE');
  const trigger = await db.query('SELECT tgenabled FROM pg_trigger WHERE tgrelid=\'"JournalEntry"\'::regclass AND tgname=$1 AND NOT tgisinternal', ["JournalEntry_protect_posted"]);
  if (trigger.rowCount !== 1 || trigger.rows[0].tgenabled !== "O") throw new Error("Expected journal protection trigger is not enabled.");
  const journals = await db.query('SELECT id,number,description,status FROM "JournalEntry" WHERE "organizationId"=$1 AND (description LIKE $2 OR description LIKE $3) FOR UPDATE', [target, `${oldPrefix}%`, `${oldLegacy}%`]);
  if (journals.rowCount !== 22) throw new Error(`Expected 22 labeled test entries, found ${journals.rowCount}; nothing changed.`);
  const other = await db.query('SELECT count(*)::int AS count FROM "Product" WHERE "organizationId"=$1 AND code = ANY($2::text[])', [target, Array.from({length: 8}, (_, i) => `KALA-${String(i + 1).padStart(3, "0")}`)]);
  if (other.rows[0].count) throw new Error("A replacement product code already exists; nothing changed.");

  const accounts = await db.query('UPDATE "LedgerAccount" SET name=substring(name FROM $1::int),"updatedAt"=now() WHERE "organizationId"=$2 AND code = ANY($3::text[]) AND name LIKE $4', ["نمونه - ".length + 1, target, Array.from({length: 10}, (_, i) => `990${String(i + 1).padStart(3, "0")}`), "نمونه - %"]);
  const parties = await db.query('UPDATE "Party" SET name=substring(name FROM $1::int), address=replace(address,$2,$3), "updatedAt"=now() WHERE "organizationId"=$4 AND name LIKE $5', [oldPrefix.length + 1, "نمونه", "بهار", target, `${oldPrefix}%`]);
  const products = await db.query('UPDATE "Product" SET name=substring(name FROM $1::int), code=replace(code,$2,$3), description=$4,"updatedAt"=now() WHERE "organizationId"=$5 AND code = ANY($6::text[]) AND name LIKE $7', [oldPrefix.length + 1, "DEMO-", "KALA-", "مشخصات کالا و خدمات", target, Array.from({length: 8}, (_, i) => `DEMO-${String(i + 1).padStart(3, "0")}`), `${oldPrefix}%`]);
  if (accounts.rowCount !== 10 || parties.rowCount !== 8 || products.rowCount !== 8) throw new Error("Unexpected labeled record count; nothing changed.");

  // This narrowly scoped maintenance operation changes only test-entry descriptions.
  // The table lock protects all organizations until the trigger is re-enabled or the transaction rolls back.
  await db.query('ALTER TABLE "JournalEntry" DISABLE TRIGGER "JournalEntry_protect_posted"');
  for (const entry of journals.rows) {
    const prefix = entry.description.startsWith(oldPrefix) ? oldPrefix : oldLegacy;
    const description = entry.description.slice(prefix.length);
    const updated = await db.query('UPDATE "JournalEntry" SET description=$1,"updatedAt"=now() WHERE id=$2 AND "organizationId"=$3 AND description=$4 RETURNING id', [description, entry.id, target, entry.description]);
    if (updated.rowCount !== 1) throw new Error("Journal entry changed unexpectedly.");
    if (entry.status === "POSTED") await db.query('INSERT INTO "JournalEvent" (id,"organizationId","entryId","actorId","actorName",action) VALUES ($1,$2,$3,$4,$5,$6)', [id(), target, entry.id, actor.rows[0].id, actor.rows[0].name, JSON.stringify({ type: "TEST_DESCRIPTION_CLEANED", before: entry.description, after: description })]);
  }
  await db.query('ALTER TABLE "JournalEntry" ENABLE TRIGGER "JournalEntry_protect_posted"');
  const enabled = await db.query('SELECT tgenabled FROM pg_trigger WHERE tgrelid=\'"JournalEntry"\'::regclass AND tgname=$1 AND NOT tgisinternal', ["JournalEntry_protect_posted"]);
  if (enabled.rows[0]?.tgenabled !== "O") throw new Error("Journal protection was not restored.");
  await db.query("COMMIT");
  console.log(JSON.stringify({ accounts: accounts.rowCount, parties: parties.rowCount, products: products.rowCount, journals: journals.rowCount, postedAuditEvents: journals.rows.filter((entry) => entry.status === "POSTED").length }));
} catch (error) {
  await db.query("ROLLBACK");
  throw error;
} finally { await db.end(); }
