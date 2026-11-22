import assert from "node:assert/strict";
import test from "node:test";
import { parseInventoryCsv } from "../scripts/inventory-csv.mjs";

const catalogIds = ["10100", "10101", "33100", "32101"];

test("sheet CSV becomes ordered on-hand and opened lists", () => {
  const csv = "colorId,onHand,opened\r\n33100,TRUE,TRUE\r\n10101,TRUE,FALSE\r\n10100,FALSE,FALSE\r\n32101,TRUE,TRUE\r\n";
  const { inventory, ignored } = parseInventoryCsv(csv, catalogIds);
  assert.deepEqual(inventory, {
    schemaVersion: 3,
    availableColorIds: ["10101", "33100", "32101"],
    openedColorIds: ["33100", "32101"],
  });
  assert.deepEqual(ignored, []);
});

test("unknown IDs are ignored and opened requires on hand", () => {
  const csv = "colorId,onHand,opened\n40101,TRUE,FALSE\n10100,FALSE,TRUE\n,,\n";
  const { inventory, ignored } = parseInventoryCsv(csv, catalogIds);
  assert.deepEqual(inventory.availableColorIds, []);
  assert.deepEqual(inventory.openedColorIds, []);
  assert.deepEqual(ignored, ["40101"]);
});

test("unpublished sheets and changed headers fail loudly", () => {
  assert.throws(() => parseInventoryCsv("<!DOCTYPE html><html>", catalogIds), /HTML instead of CSV/);
  assert.throws(() => parseInventoryCsv("id,stock\n10100,TRUE", catalogIds), /Unexpected header/);
});
