import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const catalog = JSON.parse(await readFile(new URL("../public/data/catalog.json", import.meta.url), "utf8"));
const inventory = JSON.parse(await readFile(new URL("../public/data/inventory.json", import.meta.url), "utf8"));

test("catalog contains the complete supplied Basic and Matte swatches", () => {
  assert.equal(catalog.filaments.length, 55);
  assert.equal(catalog.filaments.filter((item) => item.type === "Basic").length, 30);
  assert.equal(catalog.filaments.filter((item) => item.type === "Matte").length, 25);
  assert.equal(new Set(catalog.filaments.map((item) => item.id)).size, 55);
  assert.equal(new Set(catalog.filaments.map((item) => item.colorId)).size, 55);
  assert.ok(catalog.filaments.every((item) => /^#[0-9A-F]{6}$/.test(item.hex)));
  assert.ok(catalog.filaments.every((item) => /^\d{5}$/.test(item.colorId)));
});

test("inventory contains 30 unique known Bambu color IDs", () => {
  const catalogColorIds = new Set(catalog.filaments.map((item) => item.colorId));
  assert.equal(inventory.availableColorIds.length, 30);
  assert.equal(new Set(inventory.availableColorIds).size, 30);
  assert.ok(inventory.availableColorIds.every((id) => catalogColorIds.has(id)));
});

test("opened colors are 12 unique IDs that are also available", () => {
  const available = new Set(inventory.availableColorIds);
  assert.equal(inventory.openedColorIds.length, 12);
  assert.equal(new Set(inventory.openedColorIds).size, 12);
  assert.ok(inventory.openedColorIds.every((id) => available.has(id)));
});

test("public inventory exposes availability and opened state only", () => {
  assert.deepEqual(Object.keys(inventory).sort(), ["availableColorIds", "openedColorIds", "schemaVersion"]);
  const serialized = JSON.stringify(inventory).toLowerCase();
  for (const privateField of ["price", "quantity", "cost", "store", "code"]) {
    assert.equal(serialized.includes(privateField), false);
  }
});
