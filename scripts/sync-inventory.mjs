// Pulls stock from the spreadsheet's published `site` tab and rewrites
// public/data/inventory.json. Runs before every deploy; also `npm run sync`.
//
// Source: INVENTORY_CSV_URL from the environment or .env.deploy, or a URL/file
// path given as the first argument.

import { readFile, writeFile } from "node:fs/promises";
import { parseInventoryCsv } from "./inventory-csv.mjs";

const projectDir = new URL("../", import.meta.url);
const inventoryPath = new URL("public/data/inventory.json", projectDir);

async function csvSource() {
  if (process.argv[2]) return process.argv[2];
  if (process.env.INVENTORY_CSV_URL) return process.env.INVENTORY_CSV_URL;
  try {
    const env = await readFile(new URL(".env.deploy", projectDir), "utf8");
    const match = env.match(/^INVENTORY_CSV_URL=["']?([^"'\n]*)["']?\s*$/m);
    if (match?.[1]) return match[1];
  } catch {
    // No .env.deploy; fall through to the error below.
  }
  throw new Error("Set INVENTORY_CSV_URL in .env.deploy (the `site` tab's \"Publish to web\" CSV link).");
}

async function readCsv(source) {
  if (!/^https?:\/\//.test(source)) return readFile(source, "utf8");
  const response = await fetch(source, { signal: AbortSignal.timeout(20_000), redirect: "follow" });
  if (!response.ok) throw new Error(`Fetching the sheet failed: HTTP ${response.status}`);
  return response.text();
}

const catalog = JSON.parse(await readFile(new URL("public/data/catalog.json", projectDir), "utf8"));
const catalogColorIds = catalog.filaments.map((filament) => filament.colorId);

const { inventory, ignored } = parseInventoryCsv(await readCsv(await csvSource()), catalogColorIds);
if (inventory.availableColorIds.length === 0) {
  throw new Error("The sheet reports nothing on hand. Refusing to publish an empty shelf.");
}

const previous = JSON.parse(await readFile(inventoryPath, "utf8"));
const changes = [];
for (const [key, label] of [["availableColorIds", "on hand"], ["openedColorIds", "opened"]]) {
  const before = new Set(previous[key] ?? []);
  const after = new Set(inventory[key]);
  const added = [...after].filter((id) => !before.has(id));
  const removed = [...before].filter((id) => !after.has(id));
  if (added.length) changes.push(`  + ${label}: ${added.join(", ")}`);
  if (removed.length) changes.push(`  - ${label}: ${removed.join(", ")}`);
}

await writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);
console.log(`Inventory synced: ${inventory.availableColorIds.length} on hand, ${inventory.openedColorIds.length} opened.`);
console.log(changes.length ? changes.join("\n") : "  No changes since the last sync.");
if (ignored.length) console.log(`  Ignored IDs not in the catalog: ${ignored.join(", ")}`);
