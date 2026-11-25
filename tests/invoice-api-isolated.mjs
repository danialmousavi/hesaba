import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local", quiet: true });
const databaseUrl = new URL(process.env.DATABASE_URL);
const name = `hesaba_invoice_test_${randomBytes(8).toString("hex")}`;
const testUrl = new URL(databaseUrl);
testUrl.pathname = `/${name}`;
const admin = new pg.Client({ connectionString: databaseUrl.toString() });
await admin.connect();
let server, db, created = false, stderr = "";
try {
  await admin.query(`CREATE DATABASE "${name}"`);
  created = true;
  const probe = createServer();
  await new Promise((resolve, reject) => { probe.once("error", reject); probe.listen(0, "127.0.0.1", resolve); });
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  const base = `http://localhost:${port}`;
  const env = { ...process.env, DATABASE_URL: testUrl.toString(), BETTER_AUTH_URL: base, BETTER_AUTH_SECRET: randomBytes(32).toString("hex"), NODE_ENV: "production" };
  const migration = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env, encoding: "utf8", windowsHide: true });
  assert.equal(migration.status, 0, migration.stderr || migration.stdout);
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", String(port)], { env, windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
  server.stderr.on("data", (chunk) => { stderr = (stderr + chunk).slice(-8000); });
  let ready = false;
  for (let i = 0; i < 80 && !ready; i++) {
    if (server.exitCode !== null) throw new Error(`Server exited: ${stderr}`);
    try { ready = (await fetch(`${base}/api/auth/get-session`)).ok; } catch { /* starting */ }
    if (!ready) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(ready, `Server did not start: ${stderr}`);
  async function signup() {
    const response = await fetch(`${base}/api/auth/sign-up/email`, { method: "POST", headers: { origin: base, "content-type": "application/json" }, body: JSON.stringify({ name: "Test", email: `${randomUUID()}@example.invalid`, password: randomUUID() }) });
    assert.equal(response.status, 200, await response.clone().text());
    return { id: (await response.json()).user.id, cookie: response.headers.getSetCookie().map((v) => v.split(";")[0]).join("; ") };
  }
  const owner = await signup(), viewer = await signup(), other = await signup();
  const id = () => `c${randomUUID().replaceAll("-", "")}`;
  const org = id(), foreignOrg = id(), year = id(), foreignYear = id(), customer = id(), foreignCustomer = id(), inactiveCustomer = id(), product = id(), foreignProduct = id(), inactiveProduct = id();
  db = new pg.Client({ connectionString: testUrl.toString() });
  await db.connect();
  for (const orgId of [org, foreignOrg]) await db.query('INSERT INTO "Organization" (id,name,slug,"updatedAt") VALUES ($1,$1,$1,now())', [orgId]);
  for (const [user, orgId, role] of [[owner.id,org,"ADMIN"],[viewer.id,org,"VIEWER"],[other.id,foreignOrg,"ADMIN"]]) await db.query('INSERT INTO "Membership" (id,"userId","organizationId",role,"updatedAt") VALUES ($1,$2,$3,$4,now())', [id(),user,orgId,role]);
  for (const [yearId, orgId] of [[year,org],[foreignYear,foreignOrg]]) await db.query('INSERT INTO "FiscalYear" (id,"organizationId",name,"startDate","endDate","updatedAt") VALUES ($1,$2,$1,\'2026-01-01\',\'2026-12-31\',now())', [yearId,orgId]);
  for (const [partyId, orgId, active] of [[customer,org,true],[foreignCustomer,foreignOrg,true],[inactiveCustomer,org,false]]) await db.query('INSERT INTO "Party" (id,"organizationId",name,"isCustomer","isActive","updatedAt") VALUES ($1,$2,\'Customer\',true,$3,now())', [partyId,orgId,active]);
  for (const [productId, orgId, active] of [[product,org,true],[foreignProduct,foreignOrg,true],[inactiveProduct,org,false]]) await db.query('INSERT INTO "Product" (id,"organizationId",code,name,type,unit,"salePrice","isActive","updatedAt") VALUES ($1,$2,$1,\'Original product\',\'GOODS\',\'unit\',100,$3,now())', [productId,orgId,active]);
  const headers = (user) => ({ cookie: user.cookie, origin: base, "content-type": "application/json" });
  const ownerPage = await fetch(`${base}/dashboard/invoices`, { headers: headers(owner) });
  assert.equal(ownerPage.status, 200);
  const ownerHtml = await ownerPage.text();
  assert.ok(ownerHtml.includes("فاکتورهای فروش") && ownerHtml.includes("فاکتور جدید") && ownerHtml.includes("Customer") && ownerHtml.includes("Original product"));
  const viewerPage = await fetch(`${base}/dashboard/invoices`, { headers: headers(viewer) });
  assert.equal(viewerPage.status, 200);
  assert.ok((await viewerPage.text()).includes("نقش مشاهده‌گر اجازه ثبت فاکتور ندارد"));
  const receiptPage = await fetch(`${base}/dashboard/receipts`, { headers: headers(owner) });
  assert.equal(receiptPage.status, 200);
  assert.ok((await receiptPage.text()).includes("دریافت از مشتریان"));
  const viewerReceiptPage = await fetch(`${base}/dashboard/receipts`, { headers: headers(viewer) });
  assert.equal(viewerReceiptPage.status, 200);
  assert.ok((await viewerReceiptPage.text()).includes("نقش مشاهده‌گر اجازه ثبت دریافت ندارد"));
  const input = { fiscalYearId: year, customerId: customer, date: "2026-05-01", lines: [{ productId: product, quantity: "1.250", unitPrice: "1000", discountAmount: "50", taxAmount: "120" }] };
  const post = (user, body, origin = base) => fetch(`${base}/api/invoices`, { method: "POST", headers: { ...headers(user), origin }, body: JSON.stringify(body) });
  assert.equal((await fetch(`${base}/api/invoices`)).status, 401);
  assert.equal((await post(viewer,input)).status, 403);
  assert.equal((await post(owner,input,"http://invalid.example")).status, 403);
  for (const invalid of [
    { ...input, fiscalYearId: foreignYear }, { ...input, customerId: foreignCustomer }, { ...input, customerId: inactiveCustomer },
    { ...input, date: "2027-01-01" }, { ...input, lines: [{ ...input.lines[0], productId: foreignProduct }] },
    { ...input, lines: [{ ...input.lines[0], productId: inactiveProduct }] }, { ...input, lines: [{ ...input.lines[0], discountAmount: "9999" }] },
    { ...input, totals: { total: "1" } },
  ]) assert.equal((await post(owner,invalid)).status, 400);
  const createdInvoice = await post(owner,input);
  assert.equal(createdInvoice.status, 201, await createdInvoice.clone().text());
  const invoice = (await createdInvoice.json()).invoice;
  assert.equal(invoice.totals.total, "1320");
  assert.equal(invoice.lines[0].productName, "Original product");
  assert.equal((await fetch(`${base}/api/invoices/${invoice.id}`, { headers: headers(other) })).status, 404);
  assert.equal((await fetch(`${base}/api/invoices/${invoice.id}`, { headers: headers(viewer) })).status, 200);
  assert.equal((await fetch(`${base}/api/invoices?fiscalYearId=${foreignYear}`, { headers: headers(owner) })).status, 404);
  assert.equal((await (await fetch(`${base}/api/invoices`, { headers: headers(other) })).json()).total, 0);
  assert.equal((await (await fetch(`${base}/api/invoices`, { headers: headers(owner) })).json()).total, 1);
  await db.query('UPDATE "Product" SET name=\'Changed\' WHERE id=$1', [product]);
  assert.equal((await (await fetch(`${base}/api/invoices/${invoice.id}`, { headers: headers(owner) })).json()).invoice.lines[0].productName, "Original product");
  const patch = (user, body, origin = base) => fetch(`${base}/api/invoices/${invoice.id}`, { method: "PATCH", headers: { ...headers(user), origin }, body: JSON.stringify(body) });
  const edit = { revision: invoice.revision, customerId: customer, date: "2026-05-02", description: "Changed", lines: [{ ...input.lines[0], id: invoice.lines[0].id, quantity: "2", unitPrice: "1000" }] };
  assert.equal((await patch(viewer, edit)).status, 403);
  assert.equal((await patch(owner, edit, "http://invalid.example")).status, 403);
  assert.equal((await patch(other, edit)).status, 404);
  for (const invalid of [
    { ...edit, customerId: foreignCustomer }, { ...edit, customerId: inactiveCustomer }, { ...edit, date: "2027-01-01" },
    { ...edit, lines: [{ ...edit.lines[0], productId: foreignProduct }] }, { ...edit, lines: [{ ...edit.lines[0], productId: inactiveProduct }] },
    { ...edit, lines: [{ ...edit.lines[0], discountAmount: "9999" }] }, { ...edit, lines: [edit.lines[0], edit.lines[0]] },
    { ...edit, lines: [{ ...edit.lines[0], id: id() }] }, { ...edit, fiscalYearId: foreignYear },
  ]) assert.equal((await patch(owner, invalid)).status, 400);
  const editedResponse = await patch(owner, edit);
  assert.equal(editedResponse.status, 200, await editedResponse.clone().text());
  const edited = (await editedResponse.json()).invoice;
  assert.equal(edited.revision, 1);
  assert.equal(edited.totals.total, "2070");
  assert.equal(edited.lines[0].id, invoice.lines[0].id);
  assert.equal(edited.lines[0].productName, "Original product");
  assert.equal((await patch(owner, edit)).status, 409);
  const concurrent = { ...edit, revision: edited.revision, description: "Concurrent" };
  const outcomes = await Promise.all([patch(owner, concurrent), patch(owner, concurrent)]);
  assert.deepEqual(outcomes.map((response) => response.status).sort(), [200, 409]);
  const latest = (await (await fetch(`${base}/api/invoices/${invoice.id}`, { headers: headers(owner) })).json()).invoice;
  assert.equal(latest.revision, 2);
  assert.equal(latest.lines.length, 1);
  await db.query('UPDATE "FiscalYear" SET status=\'CLOSED\' WHERE id=$1', [year]);
  assert.equal((await patch(owner, { ...edit, revision: latest.revision })).status, 400);
  await db.query('UPDATE "FiscalYear" SET status=\'OPEN\' WHERE id=$1', [year]);
  assert.equal((await fetch(`${base}/api/fiscal-years/${year}/close`, { method: "POST", headers: headers(owner) })).status, 409);
  assert.equal((await fetch(`${base}/api/invoices/${invoice.id}`, { method: "DELETE", headers: headers(viewer) })).status, 403);
  assert.equal((await fetch(`${base}/api/invoices/${invoice.id}`, { method: "DELETE", headers: headers(other) })).status, 404);
  assert.equal((await fetch(`${base}/api/invoices/${invoice.id}`, { method: "DELETE", headers: headers(owner) })).status, 200);
  const draftResponse = await post(owner, input);
  assert.equal(draftResponse.status, 201, await draftResponse.clone().text());
  const draft = (await draftResponse.json()).invoice;
  const receivable = id(), revenue = id(), tax = id(), foreignRevenue = id();
  for (const [account, orgId, type] of [[receivable,org,"ASSET"],[revenue,org,"REVENUE"],[tax,org,"LIABILITY"],[foreignRevenue,foreignOrg,"REVENUE"]]) {
    await db.query('INSERT INTO "LedgerAccount" (id,"organizationId",code,name,type,"updatedAt") VALUES ($1,$2,$1,$1,$3,now())', [account, orgId, type]);
  }
  const issue = (user, body, origin = base) => fetch(`${base}/api/invoices/${draft.id}/issue`, { method: "POST", headers: { ...headers(user), origin }, body: JSON.stringify(body) });
  const issueInput = { revision: draft.revision, revenueAccountId: revenue, taxAccountId: tax };
  assert.equal((await issue(viewer, issueInput)).status, 403);
  assert.equal((await issue(other, issueInput)).status, 404);
  assert.equal((await issue(owner, issueInput, "http://invalid.example")).status, 403);
  assert.equal((await issue(owner, issueInput)).status, 409);
  await db.query('INSERT INTO "PartyAccount" (id,"organizationId","partyId","accountId",purpose) VALUES ($1,$2,$3,$4,\'RECEIVABLE\')', [id(), org, customer, receivable]);
  assert.equal((await issue(owner, { ...issueInput, revision: 1 })).status, 409);
  assert.equal((await issue(owner, { ...issueInput, taxAccountId: null })).status, 400);
  assert.equal((await issue(owner, { ...issueInput, revenueAccountId: foreignRevenue })).status, 409);
  assert.equal((await issue(owner, { ...issueInput, revenueAccountId: tax })).status, 400);
  await db.query('UPDATE "FiscalYear" SET status=\'CLOSED\' WHERE id=$1', [year]);
  assert.equal((await issue(owner, issueInput)).status, 409);
  await db.query('UPDATE "FiscalYear" SET status=\'OPEN\' WHERE id=$1', [year]);
  await db.query('UPDATE "LedgerAccount" SET "isActive"=false WHERE id=$1', [revenue]);
  assert.equal((await issue(owner, issueInput)).status, 409);
  await db.query('UPDATE "LedgerAccount" SET "isActive"=true WHERE id=$1', [revenue]);
  await db.query('UPDATE "Product" SET "isActive"=false WHERE id=$1', [product]);
  assert.equal((await issue(owner, issueInput)).status, 409);
  await db.query('UPDATE "Product" SET "isActive"=true WHERE id=$1', [product]);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM "JournalEntry" WHERE "organizationId"=$1', [org])).rows[0].n, 0);
  const issuance = await Promise.all([issue(owner, issueInput), issue(owner, issueInput)]);
  assert.deepEqual(issuance.map((response) => response.status).sort(), [200,409]);
  const issued = (await issuance.find((response) => response.status === 200).json());
  assert.equal(issued.invoice.status, "ISSUED");
  assert.equal(issued.invoice.number, 1);
  assert.equal(issued.invoice.totals.total, "1320");
  assert.equal((await issue(owner, issueInput)).status, 409);
  const journal = await db.query('SELECT l."accountId",l.debit::text,l.credit::text FROM "JournalLine" l WHERE l."entryId"=$1', [issued.journal.id]);
  const amounts = new Map(journal.rows.map((row) => [row.accountId, [row.debit, row.credit]]));
  assert.deepEqual(amounts.get(receivable), ["1320", "0"]);
  assert.deepEqual(amounts.get(revenue), ["0", "1200"]);
  assert.deepEqual(amounts.get(tax), ["0", "120"]);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM "JournalEntry" WHERE "organizationId"=$1 AND status=\'POSTED\'', [org])).rows[0].n, 1);
  assert.ok((await db.query('SELECT "firstUsedAt" FROM "PartyAccount" WHERE "partyId"=$1', [customer])).rows[0].firstUsedAt);
  await assert.rejects(db.query('UPDATE "Invoice" SET description=\'changed\' WHERE id=$1', [draft.id]), { code: "23514" });
  await assert.rejects(db.query('DELETE FROM "InvoiceLine" WHERE "invoiceId"=$1', [draft.id]), { code: "23514" });
  await assert.rejects(db.query('UPDATE "InvoiceLine" SET "unitPrice"=2 WHERE "invoiceId"=$1', [draft.id]), { code: "23514" });
  await assert.rejects(db.query('UPDATE "JournalLine" SET debit=1 WHERE "entryId"=$1', [issued.journal.id]), { code: "23514" });
  assert.equal((await (await fetch(`${base}/api/invoices?status=issued`, { headers: headers(owner) })).json()).total, 1);
  assert.equal((await (await fetch(`${base}/api/invoices/${draft.id}`, { headers: headers(owner) })).json()).invoice.status, "ISSUED");
  const noTaxInput = { ...input, lines: [{ ...input.lines[0], quantity: "1", unitPrice: "100", discountAmount: "0", taxAmount: "0" }] };
  const noTaxDraft = (await (await post(owner, noTaxInput)).json()).invoice;
  const noTaxResponse = await fetch(`${base}/api/invoices/${noTaxDraft.id}/issue`, { method: "POST", headers: headers(owner), body: JSON.stringify({ revision: 0, revenueAccountId: revenue, taxAccountId: null }) });
  assert.equal(noTaxResponse.status, 200, await noTaxResponse.clone().text());
  const noTaxIssued = await noTaxResponse.json();
  assert.equal(noTaxIssued.invoice.number, 2);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM "JournalLine" WHERE "entryId"=$1', [noTaxIssued.journal.id])).rows[0].n, 2);
  const zeroDraft = (await (await post(owner, { ...noTaxInput, lines: [{ ...noTaxInput.lines[0], discountAmount: "100" }] })).json()).invoice;
  assert.equal((await fetch(`${base}/api/invoices/${zeroDraft.id}/issue`, { method: "POST", headers: headers(owner), body: JSON.stringify({ revision: 0, revenueAccountId: revenue, taxAccountId: null }) })).status, 400);
  assert.equal((await fetch(`${base}/api/invoices/${zeroDraft.id}`, { method: "DELETE", headers: headers(owner) })).status, 200);
  const cash = id();
  await db.query('INSERT INTO "LedgerAccount" (id,"organizationId",code,name,type,"updatedAt") VALUES ($1,$2,$1,\'Cash\',\'ASSET\',now())', [cash, org]);
  if (process.env.RECEIPT_UI_BROWSER) {
    const { testReceiptBrowser } = await import("./receipt-ui-browser.mjs");
    await testReceiptBrowser({ chromePath: process.env.RECEIPT_UI_BROWSER, base, cookie: owner.cookie, ownerId: owner.id, organizationId: org, customerId: customer, cashId: cash });
  }
  const receiptInput = { requestKey: randomUUID(), fiscalYearId: year, partyId: customer, date: "2026-05-10", amount: "800", method: "CASH", settlementAccountId: cash, description: "Partial receipt", allocations: [{ invoiceId: draft.id, amount: "800" }] };
  const receiptPost = (user, body, origin = base) => fetch(`${base}/api/receipts`, { method: "POST", headers: { ...headers(user), origin }, body: JSON.stringify(body) });
  assert.equal((await fetch(`${base}/api/receipts`)).status, 401);
  assert.equal((await receiptPost(viewer, receiptInput)).status, 403);
  assert.equal((await receiptPost(owner, receiptInput, "http://invalid.example")).status, 403);
  assert.equal((await receiptPost(other, receiptInput)).status, 400);
  for (const invalid of [
    { ...receiptInput, amount: "801" }, { ...receiptInput, allocations: [{ invoiceId: draft.id, amount: "1321" }], amount: "1321" },
    { ...receiptInput, date: "2026-01-01" }, { ...receiptInput, settlementAccountId: receivable },
    { ...receiptInput, allocations: [{ invoiceId: draft.id, amount: "400" }, { invoiceId: draft.id, amount: "400" }] },
    { ...receiptInput, allocations: [{ invoiceId: zeroDraft.id, amount: "800" }] },
  ]) assert.ok([400,409].includes((await receiptPost(owner, invalid)).status));
  const competing = { ...receiptInput, requestKey: randomUUID() };
  const race = await Promise.all([receiptPost(owner, receiptInput), receiptPost(owner, competing)]);
  assert.deepEqual(race.map((response) => response.status).sort(), [201,409]);
  const winner = race[0].status === 201 ? receiptInput : competing;
  const successful = await race.find((response) => response.status === 201).json();
  assert.equal(successful.receipt.amount, "800");
  const repeat = await receiptPost(owner, winner);
  assert.equal(repeat.status, 200, await repeat.clone().text());
  assert.equal((await repeat.json()).replay, true);
  assert.equal((await receiptPost(owner, { ...winner, description: "Different" })).status, 409);
  const receiptJournal = await db.query('SELECT "accountId",debit::text,credit::text FROM "JournalLine" WHERE "entryId"=$1', [successful.receipt.journalEntryId]);
  const receiptAmounts = new Map(receiptJournal.rows.map((row) => [row.accountId, [row.debit, row.credit]]));
  assert.deepEqual(receiptAmounts.get(cash), ["800", "0"]);
  assert.deepEqual(receiptAmounts.get(receivable), ["0", "800"]);
  assert.equal(successful.receipt.party.name, "Customer");
  assert.equal(successful.receipt.settlementAccount.name, "Cash");
  assert.equal(successful.receipt.allocations[0].invoice.number, issued.invoice.number);
  await assert.rejects(db.query('UPDATE "Payment" SET amount=1 WHERE id=$1', [successful.receipt.id]), { code: "23514" });
  await assert.rejects(db.query('DELETE FROM "PaymentAllocation" WHERE "paymentId"=$1', [successful.receipt.id]), { code: "23514" });
  const balances = await fetch(`${base}/api/receipts/invoices?partyId=${customer}`, { headers: headers(owner) });
  assert.equal(balances.status, 200);
  assert.equal((await balances.json()).invoices.find((item) => item.id === draft.id).remaining, "520");
  assert.equal((await fetch(`${base}/api/receipts/invoices?partyId=${customer}`, { headers: headers(other) })).status, 404);
  const last = { ...receiptInput, requestKey: randomUUID(), amount: "520", allocations: [{ invoiceId: draft.id, amount: "520" }] };
  const retries = await Promise.all([receiptPost(owner, last), receiptPost(owner, last)]);
  assert.deepEqual(retries.map((response) => response.status).sort(), [200,201]);
  const retryBodies = await Promise.all(retries.map((response) => response.json()));
  assert.equal(retryBodies[0].receipt.id, retryBodies[1].receipt.id);
  assert.equal((await receiptPost(owner, { ...last, requestKey: randomUUID() })).status, 409);
  assert.equal((await (await fetch(`${base}/api/receipts/invoices?partyId=${customer}`, { headers: headers(owner) })).json()).invoices.find((item) => item.id === draft.id).remaining, "0");
  assert.equal((await (await fetch(`${base}/api/receipts`, { headers: headers(owner) })).json()).total, process.env.RECEIPT_UI_BROWSER ? 3 : 2);
  assert.equal((await (await fetch(`${base}/api/receipts`, { headers: headers(other) })).json()).total, 0);
  const pendingPayment = id();
  await db.query('INSERT INTO "Payment" (id,"organizationId","fiscalYearId","partyId",type,date,amount,method,"settlementAccountId","updatedAt") VALUES ($1,$2,$3,$4,\'RECEIPT\',\'2026-05-11\',1,\'CASH\',$5,now())', [pendingPayment,org,year,customer,cash]);
  assert.equal((await fetch(`${base}/api/fiscal-years/${year}/close`, { method: "POST", headers: headers(owner) })).status, 409);
  await db.query('DELETE FROM "Payment" WHERE id=$1', [pendingPayment]);
  assert.equal((await fetch(`${base}/api/fiscal-years/${year}/close`, { method: "POST", headers: headers(owner) })).status, 200);
  assert.equal((await receiptPost(owner, { ...last, requestKey: randomUUID() })).status, 400);
  assert.equal((await post(owner,input)).status, 400);
  console.log("Invoice API integration tests passed.");
} catch (error) {
  if (stderr) console.error(stderr);
  throw error;
} finally {
  if (db) await db.end();
  if (server && server.exitCode === null) { server.kill(); await new Promise((resolve) => server.once("exit", resolve)); }
  if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.end();
}
