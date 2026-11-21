import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
const original = new URL(process.env.DATABASE_URL);
const dbName = `hesaba_test_${randomBytes(8).toString("hex")}`;
const testUrl = new URL(original);
testUrl.pathname = `/${dbName}`;
const admin = new pg.Client({ connectionString: original.toString() });
await admin.connect();
let server;
let created = false;
try {
  await admin.query(`CREATE DATABASE "${dbName}"`);
  created = true;
  const probe = createServer();
  await new Promise((resolve, reject) => { probe.once("error", reject); probe.listen(0, "127.0.0.1", resolve); });
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  const base = `http://localhost:${port}`;
  const env = { ...process.env, DATABASE_URL: testUrl.toString(), BETTER_AUTH_URL: base, BETTER_AUTH_SECRET: randomBytes(32).toString("hex"), NODE_ENV: "production" };
  const migration = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env, encoding: "utf8", windowsHide: true });
  assert.equal(migration.status, 0, migration.stderr || migration.stdout);
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", String(port)], { env, windowsHide: true, stdio: "ignore" });
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    if (server.exitCode !== null) throw new Error("Test server exited before becoming ready");
    try { const response = await fetch(`${base}/api/auth/get-session`); ready = response.ok; } catch { /* server starting */ }
    if (!ready) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(ready, "Test server did not start");
  const token = randomUUID().replaceAll("-", "");
  const org = `c${token}a`, year = `c${token}b`, debitAccount = `c${token}c`, creditAccount = `c${token}d`;
  const signup = await fetch(`${base}/api/auth/sign-up/email`, { method: "POST", headers: { origin: base, "content-type": "application/json" }, body: JSON.stringify({ name: "Test", email: `${token}@example.invalid`, password: randomUUID() }) });
  assert.equal(signup.status, 200, await signup.clone().text());
  const user = (await signup.json()).user.id;
  const cookie = signup.headers.getSetCookie().map((v) => v.split(";")[0]).join("; ");
  const db = new pg.Client({ connectionString: testUrl.toString() });
  await db.connect();
  try {
    await db.query('INSERT INTO "Organization" (id,name,slug,"updatedAt") VALUES ($1,$2,$1,now())', [org, "Test"]);
    await db.query('INSERT INTO "Membership" (id,"userId","organizationId",role,"updatedAt") VALUES ($1,$2,$3,$4,now())', [`c${token}e`, user, org, "ADMIN"]);
    await db.query('INSERT INTO "FiscalYear" (id,"organizationId",name,"startDate","endDate","updatedAt") VALUES ($1,$2,$3,$4,$5,now())', [year, org, "Test", "2026-01-01", "2026-12-31"]);
    for (const [id, code] of [[debitAccount, "100"], [creditAccount, "200"]]) await db.query('INSERT INTO "LedgerAccount" (id,"organizationId",code,name,type,"updatedAt") VALUES ($1,$2,$3,$4,$5,now())', [id, org, code, code, "ASSET"]);
  } finally { await db.end(); }
  const headers = { cookie, origin: base, "content-type": "application/json" };
  const amount = "99999999999999999999";
  const draft = { fiscalYearId: year, number: 1, date: "2026-06-01", description: "Test", lines: [{ accountId: debitAccount, debit: amount, credit: "0" }, { accountId: creditAccount, debit: "0", credit: amount }] };
  const createdEntry = await fetch(`${base}/api/journal-entries`, { method: "POST", headers, body: JSON.stringify(draft) });
  assert.equal(createdEntry.status, 201, await createdEntry.clone().text());
  const id = (await createdEntry.json()).entry.id;
  const posted = await fetch(`${base}/api/journal-entries/${id}/post`, { method: "POST", headers });
  assert.equal(posted.status, 200, await posted.clone().text());
  assert.equal((await fetch(`${base}/api/journal-entries/${id}/post`, { method: "POST", headers })).status, 409);
  const second = await fetch(`${base}/api/journal-entries`, { method: "POST", headers, body: JSON.stringify({ ...draft, number: 2 }) });
  assert.equal(second.status, 201, await second.clone().text());
  const secondId = (await second.json()).entry.id;
  assert.equal((await fetch(`${base}/api/journal-entries/${secondId}/post`, { method: "POST", headers })).status, 200);
  const unposted = await fetch(`${base}/api/journal-entries`, { method: "POST", headers, body: JSON.stringify({ ...draft, number: 3 }) });
  assert.equal(unposted.status, 201);
  const report = await fetch(`${base}/api/reports/trial-balance?fiscalYearId=${year}`, { headers });
  assert.equal(report.status, 200, await report.clone().text());
  const result = await report.json();
  assert.equal(result.rows.length, 2);
  const expected = (BigInt(amount) * 2n).toString();
  assert.equal(result.rows[0].debitBalance, expected);
  assert.equal(result.rows[1].creditBalance, expected);
  assert.equal(result.totals.debit, expected);
  assert.equal(result.totals.credit, expected);
  console.log("Isolated posting and trial balance checks passed.");
} finally {
  if (server && server.exitCode === null) { server.kill(); await new Promise((resolve) => server.once("exit", resolve)); }
  if (created) {
    assert.match(dbName, /^hesaba_test_[a-f0-9]{16}$/);
    await admin.query(`DROP DATABASE "${dbName}" WITH (FORCE)`);
  }
  await admin.end();
}
