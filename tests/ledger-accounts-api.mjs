import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
const base = "http://localhost:3000";
const token = randomUUID().replace(/-/g, "");
const membershipId = `c${token.slice(0, 24)}`;
const organizationId = `c${token.slice(0, 23)}a`;
const foreignOrganizationId = `c${token.slice(0, 23)}b`;
const foreignAccountId = `c${token.slice(0, 23)}c`;
const email = `ledger-test-${token}@example.invalid`;
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
let userId;
try {
  const signup = await fetch(`${base}/api/auth/sign-up/email`, {
    method: "POST", headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({ name: "Ledger Test", email, password: randomUUID() }),
  });
  assert.equal(signup.status, 200, await signup.clone().text());
  userId = (await signup.json()).user.id;
  const cookie = signup.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  await client.query('INSERT INTO "Organization" (id, name, slug, "updatedAt") VALUES ($1, $2, $3, now())', [organizationId, "Ledger test", `ledger-${token.slice(0, 12)}`]);
  await client.query('INSERT INTO "Membership" (id, "userId", "organizationId", role, "updatedAt") VALUES ($1, $2, $3, $4, now())', [membershipId, userId, organizationId, "ADMIN"]);
  async function call(method, body) {
    return fetch(`${base}/api/ledger-accounts`, { method, headers: { cookie, origin: base, "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  }
  assert.equal((await fetch(`${base}/api/ledger-accounts`)).status, 401);
  assert.equal((await call("POST", { code: "wrong", name: "دارایی", type: "ASSET" })).status, 400);
  const root = await call("POST", { code: "100", name: "دارایی", type: "ASSET" });
  assert.equal(root.status, 201);
  const rootId = (await root.json()).account.id;
  const childResponse = await call("POST", { code: "110", name: "بانک", type: "ASSET", parentId: rootId });
  assert.equal(childResponse.status, 201);
  const childId = (await childResponse.json()).account.id;
  const edit = (id, body) => fetch(`${base}/api/ledger-accounts/${id}`, { method: "PATCH", headers: { cookie, origin: base, "content-type": "application/json" }, body: JSON.stringify(body) });
  assert.equal((await edit(rootId, { isActive: false })).status, 409);
  assert.equal((await edit(childId, { code: "100" })).status, 409);
  assert.equal((await edit(childId, { name: "بانک جدید", isActive: false })).status, 200);
  assert.equal((await edit(rootId, { isActive: false })).status, 200);
  assert.equal((await edit(childId, { isActive: true })).status, 409);
  assert.equal((await edit(rootId, { isActive: true })).status, 200);
  assert.equal((await edit(childId, { isActive: true })).status, 200);
  assert.equal((await edit(childId, { parentId: rootId })).status, 400);
  assert.equal((await call("POST", { code: "120", name: "نامعتبر", type: "EXPENSE", parentId: rootId })).status, 400);
  assert.equal((await call("POST", { code: "100", name: "تکراری", type: "ASSET" })).status, 409);
  assert.equal((await call("GET")).status, 200);
  const listed = await call("GET");
  assert.equal((await listed.json()).accounts.length, 2);
  await client.query('UPDATE "Membership" SET role = $1 WHERE id = $2', ["VIEWER", membershipId]);
  assert.equal((await edit(rootId, { name: "تغییر" })).status, 403);
  assert.equal((await call("POST", { code: "130", name: "مشاهده‌گر", type: "ASSET" })).status, 403);
  await client.query('UPDATE "Membership" SET role = $1 WHERE id = $2', ["ADMIN", membershipId]);
  await client.query('INSERT INTO "Organization" (id, name, slug, "updatedAt") VALUES ($1, $2, $3, now())', [foreignOrganizationId, "Foreign", `foreign-${token.slice(0, 12)}`]);
  await client.query('INSERT INTO "LedgerAccount" (id, "organizationId", code, name, type, "updatedAt") VALUES ($1, $2, $3, $4, $5, now())', [foreignAccountId, foreignOrganizationId, "100", "Foreign asset", "ASSET"]);
  assert.equal((await call("POST", { code: "130", name: "والد خارجی", type: "ASSET", parentId: foreignAccountId })).status, 400);
  assert.equal((await edit(foreignAccountId, { name: "تغییر" })).status, 404);
  console.log("Ledger account API integration checks passed.");
} finally {
  await client.query('DELETE FROM "Organization" WHERE id = $1', [foreignOrganizationId]);
  await client.query('DELETE FROM "Organization" WHERE id = $1', [organizationId]);
  if (userId) await client.query('DELETE FROM "User" WHERE id = $1 AND email = $2', [userId, email]);
  await client.end();
}
