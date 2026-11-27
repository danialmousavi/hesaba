import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

async function pages(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? pages(path.join(dir, entry.name)) : entry.name === "page.tsx" ? [path.join(dir, entry.name)] : []))).flat();
}

const files = await pages("app/(app)/dashboard");
assert.ok(files.length >= 18);
for (const file of files) {
  const source = await readFile(file, "utf8");
  assert.match(source, /readOrganizationPage\(/, file);
  assert.doesNotMatch(source, /prisma\.membership\.find(?:First|Unique)/, file);
}
console.log(`Organization page source audit passed: ${files.length} pages.`);
