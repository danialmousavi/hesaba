import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

async function routes(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => entry.isDirectory() ? routes(path.join(dir, entry.name)) : entry.name === "route.ts" ? [path.join(dir, entry.name)] : []));
  return files.flat();
}

let reads = 0, writes = 0;
for (const file of await routes("app/api")) {
  const normalized = file.replaceAll("\\", "/");
  if (normalized.startsWith("app/api/auth/") || normalized === "app/api/organizations/active/route.ts") continue;
  const source = await readFile(file, "utf8");
  const functions = [...source.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g)];
  assert.ok(functions.length, `No audited handler found: ${file}`);
  for (let index = 0; index < functions.length; index++) {
    const match = functions[index], method = match[1];
    const body = source.slice(match.index, functions[index + 1]?.index ?? source.length);
    if (method === "GET" || normalized.endsWith("/closing-preview/route.ts")) {
      if (normalized.includes("/csv/route.ts")) assert.match(body, /reportCsv\(/, file);
      else assert.match(body, /guardOrganizationRead\(tx,\s*\w+\)/, `${method} ${file}`);
      reads++;
    } else {
      assert.match(body, /guardOrganizationWrite\(tx,\s*\w+,\s*request,/, `${method} ${file}`);
      writes++;
    }
  }
}
assert.ok(reads > 20 && writes > 10);
console.log(`Organization API source audit passed: ${reads} reads, ${writes} writes.`);
