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
  assert.equal((await fetch(`${base}/api/fiscal-years/${year}/close`, { method: "POST", headers: headers(owner) })).status, 200);
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
