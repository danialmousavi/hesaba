import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
const base = "http://localhost:3000";
const testId = randomUUID();
const email = `fiscal-test-${testId}@example.invalid`;
const orgId = `test-${testId}`;
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
let userId;
try {
  const signup = await fetch(`${base}/api/auth/sign-up/email`, {
    method: "POST", headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({ name: "Fiscal Test", email, password: randomUUID() }),
  });
  assert.equal(signup.status, 200, await signup.clone().text());
  userId = (await signup.json()).user.id;
  const cookie = signup.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  assert.ok(cookie, "signup must return session cookie");
  await client.query('INSERT INTO "Organization" (id, name, slug, "updatedAt") VALUES ($1, $2, $3, now())', [orgId, "Fiscal Test", orgId]);
  await client.query('INSERT INTO "Membership" (id, "userId", "organizationId", role, "updatedAt") VALUES ($1, $2, $3, $4, now())', [testId, userId, orgId, "ADMIN"]);
  async function call(method, body) {
    return fetch(`${base}/api/fiscal-years`, { method, headers: { cookie, origin: base, "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  }
  const valid = { name: "Test year", startDate: "2026-01-01", endDate: "2026-12-31" };
  assert.equal((await call("POST", { ...valid, endDate: "2025-01-01" })).status, 400);
  const created = await call("POST", valid);
  assert.equal(created.status, 201);
  const yearId = (await created.json()).year.id;
  assert.equal((await call("POST", { ...valid, name: "Second year" })).status, 409);
  const list = await call("GET");
  assert.equal(list.status, 200);
  assert.equal((await list.json()).years.length, 1);
  await client.query('UPDATE "Membership" SET role = $1 WHERE id = $2', ["VIEWER", testId]);
  assert.equal((await call("GET")).status, 200);
  assert.equal((await call("POST", valid)).status, 403);
  const close = (id, headers = { cookie, origin: base }) => fetch(`${base}/api/fiscal-years/${id}/close`, { method: "POST", headers });
  assert.equal((await close(yearId)).status, 403);
  await client.query('UPDATE "Membership" SET role = $1 WHERE id = $2', ["ADMIN", testId]);
  assert.equal((await close(yearId, { origin: base })).status, 401);
  assert.equal((await close(yearId, { cookie, origin: "http://example.invalid" })).status, 403);
  assert.equal((await close(randomUUID())).status, 404);
  const foreignOrg = `foreign-${testId}`;
  const foreignYear = `foreign-year-${testId}`;
  await client.query('INSERT INTO "Organization" (id, name, slug, "updatedAt") VALUES ($1, $2, $3, now())', [foreignOrg, "Foreign Test", foreignOrg]);
  await client.query('INSERT INTO "FiscalYear" (id, "organizationId", name, "startDate", "endDate", "updatedAt") VALUES ($1, $2, $3, $4, $5, now())', [foreignYear, foreignOrg, "Foreign", "2026-01-01", "2026-12-31"]);
  assert.equal((await close(foreignYear)).status, 404);
  assert.equal((await close(yearId)).status, 200);
  assert.equal((await close(yearId)).status, 409);
  const events = await client.query('SELECT type, "actorId" FROM "FiscalYearEvent" WHERE "organizationId" = $1 AND "fiscalYearId" = $2 ORDER BY "createdAt", type', [orgId, yearId]);
  assert.deepEqual(events.rows.map((event) => event.type).sort(), ["CLOSED", "CREATED"]);
  assert.ok(events.rows.every((event) => event.actorId === userId));
  assert.equal((await call("POST", { ...valid, name: "Overlapping year" })).status, 409);
  assert.equal((await call("POST", { name: "Second year", startDate: "2027-01-01", endDate: "2027-12-31" })).status, 201);
  console.log("Fiscal year API integration checks passed.");
} finally {
  await client.query('DELETE FROM "Organization" WHERE id = $1', [`foreign-${testId}`]);
  await client.query('DELETE FROM "Organization" WHERE id = $1', [orgId]);
  if (userId) await client.query('DELETE FROM "User" WHERE id = $1 AND email = $2', [userId, email]);
  await client.end();
}
