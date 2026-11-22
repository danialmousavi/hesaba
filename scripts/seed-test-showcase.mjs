import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local", quiet: true });
const organizationId = process.argv[2];
if (!organizationId || process.argv.length !== 3) throw new Error("Provide exactly the intended test organization ID.");
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const id = () => `c${randomUUID().replaceAll("-", "")}`;
const prefix = "نمونه دمو | ";
const parties = [
  ["شرکت آفتاب", true, false, "09120000001", "aftab@example.invalid", "تهران، خیابان نمونه ۱", true],
  ["فروشگاه باران", true, false, "09120000002", "baran@example.invalid", "کرج، خیابان نمونه ۲", true],
  ["مریم رضایی", true, false, "09120000003", null, "اصفهان، خیابان نمونه ۳", true],
  ["شرکت پارس کالا", false, true, "09120000004", "pars@example.invalid", "تهران، خیابان نمونه ۴", true],
  ["تأمین گستر", false, true, "09120000005", "tamin@example.invalid", "شیراز، خیابان نمونه ۵", true],
  ["شرکت سپهر", true, true, "09120000006", "sepehr@example.invalid", "تبریز، خیابان نمونه ۶", true],
  ["مشتری غیرفعال", true, false, null, null, null, false],
  ["تأمین‌کننده غیرفعال", false, true, null, null, null, false],
];
const products = [
  ["DEMO-001", "لپ‌تاپ اداری", "GOODS", "عدد", "450000000", "400000000", true],
  ["DEMO-002", "نمایشگر ۲۴ اینچ", "GOODS", "عدد", "85000000", "70000000", true],
  ["DEMO-003", "صفحه‌کلید", "GOODS", "عدد", "12000000", "9000000", true],
  ["DEMO-004", "چاپگر اداری", "GOODS", "عدد", "110000000", "95000000", true],
  ["DEMO-005", "نصب و راه‌اندازی", "SERVICE", "ساعت", "15000000", null, true],
  ["DEMO-006", "پشتیبانی ماهانه", "SERVICE", "ماه", "25000000", null, true],
  ["DEMO-007", "آموزش کاربری", "SERVICE", "جلسه", "18000000", null, true],
  ["DEMO-008", "کالای غیرفعال", "GOODS", "عدد", "3000000", "2000000", false],
];
// Every entry has exactly two opposite lines, and dates fall within the named fiscal year.
const entries = [
  ["2025-04-15", "فروش فروردین", "990002", "990008", "80000000", true],
  ["2025-05-15", "فروش اردیبهشت", "990002", "990008", "120000000", true],
  ["2025-05-20", "هزینه اردیبهشت", "990010", "990002", "30000000", true],
  ["2025-06-15", "فروش خرداد", "990002", "990008", "160000000", true],
  ["2025-06-20", "هزینه خرداد", "990010", "990002", "45000000", true],
  ["2025-07-15", "فروش تیر", "990002", "990008", "110000000", true],
  ["2025-08-15", "فروش مرداد", "990002", "990008", "190000000", true],
  ["2025-08-20", "هزینه مرداد", "990010", "990002", "55000000", true],
  ["2025-09-15", "فروش شهریور", "990002", "990008", "140000000", true],
  ["2025-10-15", "فروش مهر", "990002", "990008", "210000000", true],
  ["2025-11-15", "فروش آبان", "990002", "990008", "175000000", true],
  ["2025-11-20", "هزینه آبان", "990010", "990002", "60000000", true],
  ["2025-12-15", "فروش آذر", "990002", "990008", "230000000", true],
  ["2026-01-15", "فروش دی", "990002", "990008", "155000000", true],
  ["2026-01-20", "هزینه دی", "990010", "990002", "65000000", true],
  ["2026-02-15", "پیش‌نویس فروش بهمن", "990002", "990008", "100000000", false],
  ["2026-02-20", "پیش‌نویس هزینه بهمن", "990010", "990002", "35000000", false],
];

await db.connect();
try {
  await db.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  const org = await db.query('SELECT id, name FROM "Organization" WHERE id=$1 FOR UPDATE', [organizationId]);
  if (org.rowCount !== 1 || org.rows[0].name !== "test") throw new Error("The target must be the explicitly selected organization named test.");
  const yearResult = await db.query('SELECT id, name, "startDate"::text AS start_date, "endDate"::text AS end_date FROM "FiscalYear" WHERE "organizationId"=$1 AND status=$2 FOR UPDATE', [organizationId, "OPEN"]);
  if (yearResult.rowCount !== 1 || yearResult.rows[0].name !== "سال مالی 1404") throw new Error("The expected open fiscal year was not found.");
  const year = yearResult.rows[0];
  if (entries.some(([date]) => date < year.start_date || date > year.end_date)) throw new Error("A sample entry is outside the fiscal year.");
  const actor = await db.query('SELECT u.id,u.name FROM "Membership" m JOIN "User" u ON u.id=m."userId" WHERE m."organizationId"=$1 AND m.role=$2 ORDER BY m."createdAt" LIMIT 1', [organizationId, "ADMIN"]);
  if (actor.rowCount !== 1) throw new Error("An organization administrator is required.");
  const reservedCodes = products.flatMap(([code]) => [code, code.replace("DEMO-", "KALA-")]);
  const collisions = await db.query('SELECT (SELECT count(*) FROM "Party" WHERE "organizationId"=$1 AND name LIKE $2) + (SELECT count(*) FROM "Product" WHERE "organizationId"=$1 AND (code = ANY($3::text[]) OR name LIKE $2)) + (SELECT count(*) FROM "JournalEntry" WHERE "organizationId"=$1 AND description LIKE $2) AS total', [organizationId, `${prefix}%`, reservedCodes]);
  if (Number(collisions.rows[0].total) > 0) throw new Error("Showcase data or reserved codes already exist; nothing was changed.");
  const accountsResult = await db.query('SELECT a.id,a.code,a.type,a."isActive", EXISTS (SELECT 1 FROM "LedgerAccount" child WHERE child."organizationId"=a."organizationId" AND child."parentId"=a.id) AS has_children FROM "LedgerAccount" a WHERE a."organizationId"=$1 AND a.code = ANY($2::text[])', [organizationId, ["990002", "990008", "990010"]]);
  const accounts = new Map(accountsResult.rows.map((account) => [account.code, account]));
  for (const [code, type] of [["990002", "ASSET"], ["990008", "REVENUE"], ["990010", "EXPENSE"]]) {
    const account = accounts.get(code);
    if (!account || account.type !== type || !account.isActive || account.has_children) throw new Error(`Expected active leaf account ${code} is unavailable.`);
  }
  for (const [name, customer, supplier, phone, email, address, active] of parties) await db.query('INSERT INTO "Party" (id,"organizationId",name,"isCustomer","isSupplier",phone,email,address,"isActive","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())', [id(), organizationId, prefix + name, customer, supplier, phone, email, address, active]);
  for (const [code, name, type, unit, salePrice, purchasePrice, active] of products) await db.query('INSERT INTO "Product" (id,"organizationId",code,name,type,unit,"salePrice","purchasePrice",description,"isActive","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())', [id(), organizationId, code, prefix + name, type, unit, salePrice, purchasePrice, "اطلاعات آزمایشی برای نمایش", active]);
  const max = await db.query('SELECT COALESCE(MAX(number),0)::int AS max FROM "JournalEntry" WHERE "organizationId"=$1 AND "fiscalYearId"=$2', [organizationId, year.id]);
  if (max.rows[0].max > 2147483647 - entries.length) throw new Error("Not enough journal numbers available.");
  for (const [index, [date, description, debitCode, creditCode, amount, post]] of entries.entries()) {
    if (!/^\d+$/.test(amount) || BigInt(amount) <= 0n || debitCode === creditCode) throw new Error("Invalid sample journal lines.");
    const entryId = id();
    await db.query('INSERT INTO "JournalEntry" (id,"organizationId","fiscalYearId",number,date,description,"updatedAt") VALUES ($1,$2,$3,$4,$5,$6,now())', [entryId, organizationId, year.id, max.rows[0].max + index + 1, date, prefix + description]);
    for (const [code, debit, credit] of [[debitCode, amount, "0"], [creditCode, "0", amount]]) await db.query('INSERT INTO "JournalLine" (id,"organizationId","entryId","accountId",debit,credit) VALUES ($1,$2,$3,$4,$5,$6)', [id(), organizationId, entryId, accounts.get(code).id, debit, credit]);
    if (post) {
      await db.query('UPDATE "JournalEntry" SET status=$1,"updatedAt"=now() WHERE id=$2 AND "organizationId"=$3', ["POSTED", entryId, organizationId]);
      await db.query('INSERT INTO "JournalEvent" (id,"organizationId","entryId","actorId","actorName",action) VALUES ($1,$2,$3,$4,$5,$6)', [id(), organizationId, entryId, actor.rows[0].id, actor.rows[0].name, "POSTED"]);
    }
  }
  await db.query("COMMIT");
  console.log(JSON.stringify({ organization: org.rows[0].name, fiscalYear: year.name, parties: parties.length, products: products.length, posted: entries.filter((entry) => entry[5]).length, drafts: entries.filter((entry) => !entry[5]).length }));
} catch (error) {
  await db.query("ROLLBACK");
  throw error;
} finally { await db.end(); }
