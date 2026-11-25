import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";
import { calculateInvoice } from "../lib/invoice-calculation.ts";

config({ path: ".env.local", quiet: true });
const orgId = process.argv[2];
const dryRun = process.argv.includes("--check");
if (!orgId || process.argv.slice(3).some((arg) => arg !== "--check") || process.argv.length > 4) throw new Error("Expected organization ID and optional --check.");
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const newId = () => `c${randomUUID().replaceAll("-", "")}`;
const accountDefs = [
  ["995101", "دریافتنی شرکت آفتاب", "ASSET", "شرکت آفتاب", "RECEIVABLE"],
  ["995102", "دریافتنی فروشگاه باران", "ASSET", "فروشگاه باران", "RECEIVABLE"],
  ["995103", "دریافتنی شرکت سپهر", "ASSET", "شرکت سپهر", "RECEIVABLE"],
  ["995104", "پرداختنی شرکت پارس کالا", "LIABILITY", "شرکت پارس کالا", "PAYABLE"],
  ["995105", "مالیات فروش پرداختنی", "LIABILITY", null, null],
];
const invoices = [
  { customer: "شرکت آفتاب", date: "2025-05-10", description: "تجهیزات اداری دفتر مرکزی", issued: true, lines: [["KALA-001", "2", "450000000", "20000000", "88000000"], ["KALA-005", "2", "15000000", "0", "3000000"]] },
  { customer: "فروشگاه باران", date: "2025-08-12", description: "تجهیزات فروشگاه", issued: true, lines: [["KALA-002", "3", "85000000", "5000000", "25000000"], ["KALA-003", "3", "12000000", "0", "3600000"]] },
  { customer: "شرکت سپهر", date: "2025-11-16", description: "پشتیبانی سامانه", issued: true, lines: [["KALA-006", "3", "25000000", "0", "7500000"]] },
  { customer: "شرکت آفتاب", date: "2026-01-21", description: "تجهیزات بخش فروش", issued: false, lines: [["KALA-004", "2", "110000000", "10000000", "21000000"], ["KALA-007", "1", "18000000", "0", "1800000"]] },
  { customer: "فروشگاه باران", date: "2026-02-06", description: "تکمیل تجهیزات اداری", issued: false, lines: [["KALA-002", "2", "85000000", "0", "0"]] },
  { customer: "شرکت سپهر", date: "2026-02-18", description: "خدمات آموزش و پشتیبانی", issued: false, lines: [["KALA-005", "1.500", "15000000", "0", "2250000"], ["KALA-007", "2", "18000000", "1000000", "3500000"]] },
];
const transactions = [
  { type: "INCOME", date: "2025-09-09", description: "دریافت بابت خدمات نگهداری", amount: "72000000", method: "BANK_TRANSFER", posted: true },
  { type: "EXPENSE", date: "2025-10-08", description: "هزینه اجاره دفتر", amount: "45000000", method: "BANK_TRANSFER", posted: true },
  { type: "INCOME", date: "2026-02-12", description: "درآمد خدمات راه‌اندازی", amount: "28000000", method: "CASH", posted: false },
  { type: "EXPENSE", date: "2026-02-16", description: "هزینه اجاره اسفند", amount: "48000000", method: "BANK_TRANSFER", posted: false },
];

await db.connect();
try {
  await db.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  const org = await db.query('SELECT id,name FROM "Organization" WHERE id=$1 FOR UPDATE', [orgId]);
  if (org.rowCount !== 1 || org.rows[0].name !== "test") throw new Error("Target must be the organization named test.");
  const yr = await db.query('SELECT id,name,"startDate"::text AS start_date,"endDate"::text AS end_date FROM "FiscalYear" WHERE "organizationId"=$1 AND status=\'OPEN\' FOR UPDATE', [orgId]);
  if (yr.rowCount !== 1) throw new Error("Exactly one open fiscal year is required.");
  const year = yr.rows[0];
  if ([...invoices, ...transactions].some(({ date }) => date < year.start_date || date > year.end_date)) throw new Error("The dates are outside the open fiscal year; no changes made.");
  const actorResult = await db.query('SELECT u.id,u.name FROM "Membership" m JOIN "User" u ON u.id=m."userId" WHERE m."organizationId"=$1 AND m.role=\'ADMIN\' ORDER BY m."createdAt" LIMIT 1', [orgId]);
  if (actorResult.rowCount !== 1) throw new Error("An organization administrator is required.");
  const actor = actorResult.rows[0];
  const reserved = await db.query('SELECT code FROM "LedgerAccount" WHERE "organizationId"=$1 AND code=ANY($2::text[])', [orgId, accountDefs.map(([code]) => code)]);
  if (reserved.rowCount) throw new Error("Reserved account codes already exist; no changes made.");
  const partyNames = [...new Set(accountDefs.flatMap(([, , , party]) => party ? [party] : []))];
  const partiesResult = await db.query('SELECT id,name,"isCustomer","isSupplier","isActive" FROM "Party" WHERE "organizationId"=$1 AND name=ANY($2::text[]) FOR UPDATE', [orgId, partyNames]);
  if (partiesResult.rowCount !== partyNames.length) throw new Error("Required parties are missing or duplicated.");
  const parties = new Map(partiesResult.rows.map((party) => [party.name, party]));
  const existingLinks = await db.query('SELECT "partyId",purpose FROM "PartyAccount" WHERE "organizationId"=$1 AND "partyId"=ANY($2::text[])', [orgId, [...parties.values()].map((party) => party.id)]);
  if (accountDefs.some(([, , , name, purpose]) => name && existingLinks.rows.some((link) => link.partyId === parties.get(name)?.id && link.purpose === purpose))) throw new Error("A party already has a conflicting account link; no changes made.");
  const productCodes = [...new Set(invoices.flatMap((invoice) => invoice.lines.map(([code]) => code)))];
  const productResult = await db.query('SELECT id,code,name,type,unit,"isActive" FROM "Product" WHERE "organizationId"=$1 AND code=ANY($2::text[]) FOR UPDATE', [orgId, productCodes]);
  if (productResult.rowCount !== productCodes.length || productResult.rows.some((item) => !item.isActive)) throw new Error("A required product is unavailable.");
  const products = new Map(productResult.rows.map((product) => [product.code, product]));
  const baseAccounts = await db.query('SELECT id,code,type,"isActive",EXISTS (SELECT 1 FROM "LedgerAccount" c WHERE c."organizationId"=a."organizationId" AND c."parentId"=a.id) AS has_children,EXISTS (SELECT 1 FROM "PartyAccount" p WHERE p."organizationId"=a."organizationId" AND p."accountId"=a.id) AS linked FROM "LedgerAccount" a WHERE "organizationId"=$1 AND code=ANY($2::text[]) FOR UPDATE', [orgId, ["990002", "990008", "990010"]]);
  const accounts = new Map(baseAccounts.rows.map((account) => [account.code, account.id]));
  for (const [code, type] of [["990002", "ASSET"], ["990008", "REVENUE"], ["990010", "EXPENSE"]]) {
    const account = baseAccounts.rows.find((item) => item.code === code);
    if (!account || account.type !== type || !account.isActive || account.has_children || account.linked) throw new Error(`Account ${code} is not an available active leaf.`);
  }
  for (const [code, name, type, partyName, purpose] of accountDefs) {
    const accountId = newId();
    await db.query('INSERT INTO "LedgerAccount" (id,"organizationId",code,name,type,"updatedAt") VALUES ($1,$2,$3,$4,$5,now())', [accountId, orgId, code, name, type]);
    accounts.set(code, accountId);
    if (partyName) {
      const party = parties.get(partyName);
      if (!party.isActive || (purpose === "RECEIVABLE" ? !party.isCustomer : !party.isSupplier)) throw new Error("Party role is invalid.");
      await db.query('INSERT INTO "PartyAccount" (id,"organizationId","partyId","accountId",purpose) VALUES ($1,$2,$3,$4,$5)', [newId(), orgId, party.id, accountId, purpose]);
      await db.query('INSERT INTO "PartyAccountEvent" (id,"organizationId","partyId",purpose,type,"actorId","actorName","newAccountId") VALUES ($1,$2,$3,$4,\'LINKED\',$5,$6,$7)', [newId(), orgId, party.id, purpose, actor.id, actor.name, accountId]);
    }
  }
  const maxJournal = await db.query('SELECT COALESCE(MAX(number),0)::int AS n FROM "JournalEntry" WHERE "organizationId"=$1 AND "fiscalYearId"=$2', [orgId, year.id]);
  const maxInvoice = await db.query('SELECT COALESCE(MAX(number),0)::int AS n FROM "Invoice" WHERE "organizationId"=$1 AND "fiscalYearId"=$2', [orgId, year.id]);
  let journalNumber = maxJournal.rows[0].n, invoiceNumber = maxInvoice.rows[0].n;
  if (journalNumber > 2147483630 || invoiceNumber > 2147483630) throw new Error("No available numbers.");
  async function postJournal(date, description, lines) {
    const debit = lines.reduce((sum, line) => sum + BigInt(line[1]), 0n), credit = lines.reduce((sum, line) => sum + BigInt(line[2]), 0n);
    if (debit <= 0n || debit !== credit) throw new Error("Journal lines do not balance.");
    const entryId = newId();
    await db.query('INSERT INTO "JournalEntry" (id,"organizationId","fiscalYearId",number,date,description,"updatedAt") VALUES ($1,$2,$3,$4,$5,$6,now())', [entryId, orgId, year.id, ++journalNumber, date, description]);
    for (const [accountId, dr, cr] of lines) await db.query('INSERT INTO "JournalLine" (id,"organizationId","entryId","accountId",debit,credit) VALUES ($1,$2,$3,$4,$5,$6)', [newId(), orgId, entryId, accountId, dr, cr]);
    await db.query('UPDATE "JournalEntry" SET status=\'POSTED\',"updatedAt"=now() WHERE id=$1', [entryId]);
    await db.query('INSERT INTO "JournalEvent" (id,"organizationId","entryId","actorId","actorName",action) VALUES ($1,$2,$3,$4,$5,\'POSTED\')', [newId(), orgId, entryId, actor.id, actor.name]);
    return entryId;
  }
  const receivables = new Map([["شرکت آفتاب", "995101"], ["فروشگاه باران", "995102"], ["شرکت سپهر", "995103"]]);
  for (const invoice of invoices) {
    const customer = parties.get(invoice.customer), invoiceId = newId();
    const inputs = invoice.lines.map(([, quantity, unitPrice, discountAmount, taxAmount]) => ({ quantity, unitPrice, discountAmount, taxAmount }));
    const totals = calculateInvoice(inputs).totals;
    await db.query('INSERT INTO "Invoice" (id,"organizationId","fiscalYearId","customerId","customerName",date,description,"updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,now())', [invoiceId, orgId, year.id, customer.id, customer.name, invoice.date, invoice.description]);
    for (const [index, [code, quantity, unitPrice, discount, tax]] of invoice.lines.entries()) {
      const product = products.get(code);
      await db.query('INSERT INTO "InvoiceLine" (id,"organizationId","invoiceId","productId",position,"productCode","productName","productType",unit,quantity,"unitPrice","discountAmount","taxAmount") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', [newId(), orgId, invoiceId, product.id, index + 1, product.code, product.name, product.type, product.unit, quantity, unitPrice, discount, tax]);
    }
    if (invoice.issued) {
      ++invoiceNumber;
      const receiptAccount = accounts.get(receivables.get(invoice.customer));
      const lines = [[receiptAccount, totals.total, "0"], [accounts.get("990008"), "0", totals.taxableAmount], ...(BigInt(totals.taxAmount) ? [[accounts.get("995105"), "0", totals.taxAmount]] : [])];
      const entryId = await postJournal(invoice.date, `فاکتور فروش ${invoiceNumber} — ${customer.name}`, lines);
      await db.query('UPDATE "PartyAccount" SET "firstUsedAt"=COALESCE("firstUsedAt",now()) WHERE "organizationId"=$1 AND "accountId"=$2', [orgId, receiptAccount]);
      await db.query('UPDATE "Invoice" SET status=\'ISSUED\',number=$2,"journalEntryId"=$3,revision=revision+1,"updatedAt"=now() WHERE id=$1', [invoiceId, invoiceNumber, entryId]);
    }
  }
  for (const item of transactions) {
    const category = accounts.get(item.type === "INCOME" ? "990008" : "990010"), cash = accounts.get("990002"), transactionId = newId();
    await db.query('INSERT INTO "FinancialTransaction" (id,"organizationId","fiscalYearId",type,date,amount,description,"paymentMethod","categoryAccountId","settlementAccountId","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())', [transactionId, orgId, year.id, item.type, item.date, item.amount, item.description, item.method, category, cash]);
    if (item.posted) {
      const lines = item.type === "INCOME" ? [[cash, item.amount, "0"], [category, "0", item.amount]] : [[category, item.amount, "0"], [cash, "0", item.amount]];
      const entryId = await postJournal(item.date, item.description, lines);
      await db.query('UPDATE "FinancialTransaction" SET status=\'POSTED\',"journalEntryId"=$2,"updatedAt"=now() WHERE id=$1', [transactionId, entryId]);
    }
  }
  await db.query(dryRun ? "ROLLBACK" : "COMMIT");
  console.log(JSON.stringify({ checkOnly: dryRun, organization: org.rows[0].name, fiscalYear: year.name, accountLinks: 4, accounts: 5, invoicesIssued: 3, invoicesDraft: 3, transactionsPosted: 2, transactionsDraft: 2 }));
} catch (error) {
  await db.query("ROLLBACK");
  throw error;
} finally { await db.end(); }
