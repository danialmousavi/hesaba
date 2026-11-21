import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local", quiet: true });
const organizationId = process.argv[2];
if (!organizationId) throw new Error("Provide the intended organization ID.");
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const id = () => `c${randomUUID().replaceAll("-", "")}`;
await db.connect();
try {
  await db.query("BEGIN");
  const organization = await db.query('SELECT id, name FROM "Organization" WHERE id=$1 FOR UPDATE', [organizationId]);
  if (organization.rowCount !== 1) throw new Error("Organization not found.");
  const actor = await db.query('SELECT u.id, u.name FROM "Membership" m JOIN "User" u ON u.id=m."userId" WHERE m."organizationId"=$1 AND m.role=$2 ORDER BY m."createdAt" LIMIT 1', [organizationId, "ADMIN"]);
  if (!actor.rowCount) throw new Error("No administrator in organization.");
  const existing = await db.query('SELECT id FROM "JournalEntry" WHERE "organizationId"=$1 AND description LIKE $2 LIMIT 1', [organizationId, "نمونه | %"]);
  if (existing.rowCount) throw new Error("Demo journal entries already exist; no data was changed.");
  const fiscalYear = await db.query('SELECT id, name, "startDate"::text AS start_date, "endDate"::text AS end_date FROM "FiscalYear" WHERE "organizationId"=$1 AND status=$2 FOR UPDATE', [organizationId, "OPEN"]);
  if (fiscalYear.rowCount !== 1) throw new Error("The organization must have one open fiscal year.");
  const year = fiscalYear.rows[0];
  const accountDefs = [
    ["990001", "نمونه - دارایی", "ASSET", null], ["990002", "نمونه - صندوق", "ASSET", "990001"],
    ["990003", "نمونه - بدهی", "LIABILITY", null], ["990004", "نمونه - وام دریافتی", "LIABILITY", "990003"],
    ["990005", "نمونه - سرمایه", "EQUITY", null], ["990006", "نمونه - سرمایه مالک", "EQUITY", "990005"],
    ["990007", "نمونه - درآمد", "REVENUE", null], ["990008", "نمونه - درآمد فروش", "REVENUE", "990007"],
    ["990009", "نمونه - هزینه", "EXPENSE", null], ["990010", "نمونه - هزینه اجاره", "EXPENSE", "990009"],
  ];
  const reserved = await db.query('SELECT code FROM "LedgerAccount" WHERE "organizationId"=$1 AND code=ANY($2::text[])', [organizationId, accountDefs.map((item) => item[0])]);
  if (reserved.rowCount) throw new Error("Demo account codes are already in use; no data was changed.");
  const accounts = new Map();
  for (const [code, name, type, parentCode] of accountDefs) {
    const accountId = id();
    await db.query('INSERT INTO "LedgerAccount" (id,"organizationId","parentId",code,name,type,"updatedAt") VALUES ($1,$2,$3,$4,$5,$6,now())', [accountId, organizationId, parentCode ? accounts.get(parentCode) : null, code, name, type]);
    accounts.set(code, accountId);
  }
  const max = await db.query('SELECT COALESCE(MAX(number),0)::int AS max FROM "JournalEntry" WHERE "organizationId"=$1 AND "fiscalYearId"=$2', [organizationId, year.id]);
  const startNumber = max.rows[0].max;
  if (startNumber > 2147483642) throw new Error("No available document numbers.");
  const sampleEntries = [
    ["سرمایه‌گذاری اولیه", [["990002", "500000000", "0"], ["990006", "0", "500000000"]]],
    ["فروش نقدی", [["990002", "150000000", "0"], ["990008", "0", "150000000"]]],
    ["پرداخت اجاره", [["990010", "40000000", "0"], ["990002", "0", "40000000"]]],
    ["دریافت وام", [["990002", "100000000", "0"], ["990004", "0", "100000000"]]],
    ["پیش‌نویس هزینه", [["990010", "10000000", "0"], ["990002", "0", "10000000"]]],
  ];
  for (let index = 0; index < sampleEntries.length; index++) {
    const [description, lines] = sampleEntries[index];
    const entryId = id();
    await db.query('INSERT INTO "JournalEntry" (id,"organizationId","fiscalYearId",number,date,description,"updatedAt") VALUES ($1,$2,$3,$4,$5,$6,now())', [entryId, organizationId, year.id, startNumber + index + 1, year.start_date, `نمونه | ${description}`]);
    for (const [code, debit, credit] of lines) await db.query('INSERT INTO "JournalLine" (id,"organizationId","entryId","accountId",debit,credit) VALUES ($1,$2,$3,$4,$5,$6)', [id(), organizationId, entryId, accounts.get(code), debit, credit]);
    if (index < sampleEntries.length - 1) {
      await db.query('UPDATE "JournalEntry" SET status=$1,"updatedAt"=now() WHERE id=$2 AND "organizationId"=$3', ["POSTED", entryId, organizationId]);
      await db.query('INSERT INTO "JournalEvent" (id,"organizationId","entryId","actorId","actorName",action) VALUES ($1,$2,$3,$4,$5,$6)', [id(), organizationId, entryId, actor.rows[0].id, actor.rows[0].name, "POSTED"]);
    }
  }
  await db.query("COMMIT");
  console.log(JSON.stringify({ organization: organization.rows[0].name, fiscalYear: year.name, date: year.start_date, accounts: accountDefs.length, posted: 4, drafts: 1, debitCreditTotal: "790000000" }));
} catch (error) {
  await db.query("ROLLBACK");
  throw error;
} finally { await db.end(); }
