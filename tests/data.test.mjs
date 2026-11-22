import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const catalog = JSON.parse(await readFile(new URL("../public/data/catalog.json", import.meta.url), "utf8"));
const inventory = JSON.parse(await readFile(new URL("../public/data/inventory.json", import.meta.url), "utf8"));

const count = (material, type) => catalog.filaments.filter((item) => item.material === material && item.type === type).length;

test("catalog contains the complete PLA Basic, PLA Matte, PETG HF and PETG Translucent lines", () => {
  assert.equal(catalog.filaments.length, 78);
  assert.equal(count("PLA", "Basic"), 30);
  assert.equal(count("PLA", "Matte"), 25);
  assert.equal(count("PETG", "HF"), 14);
  assert.equal(count("PETG", "Translucent"), 9);
  assert.equal(new Set(catalog.filaments.map((item) => item.id)).size, 78);
  assert.equal(new Set(catalog.filaments.map((item) => item.colorId)).size, 78);
  assert.ok(catalog.filaments.every((item) => /^#[0-9A-F]{6}$/.test(item.hex)));
  assert.ok(catalog.filaments.every((item) => /^\d{5}$/.test(item.colorId)));
});

test("only translucent filament carries an opacity between 0 and 1", () => {
  for (const item of catalog.filaments) {
    if (item.type === "Translucent") assert.ok(item.opacity >= 0 && item.opacity < 1, item.id);
    else assert.equal(item.opacity, undefined, item.id);
  }
});

test("inventory lists unique known color IDs, and opened colors are on hand", () => {
  const catalogColorIds = new Set(catalog.filaments.map((item) => item.colorId));
  const available = new Set(inventory.availableColorIds);
  assert.ok(available.size > 0);
  assert.equal(available.size, inventory.availableColorIds.length);
  assert.equal(new Set(inventory.openedColorIds).size, inventory.openedColorIds.length);
  assert.ok(inventory.availableColorIds.every((id) => catalogColorIds.has(id)));
  assert.ok(inventory.openedColorIds.every((id) => available.has(id)));
});

test("public inventory exposes availability and opened state only", () => {
  assert.deepEqual(Object.keys(inventory).sort(), ["availableColorIds", "openedColorIds", "schemaVersion"]);
  const serialized = JSON.stringify(inventory).toLowerCase();
  for (const privateField of ["price", "quantity", "cost", "store", "code"]) {
    assert.equal(serialized.includes(privateField), false);
  }
});
