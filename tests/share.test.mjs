import assert from "node:assert/strict";
import test from "node:test";
import { MAX_PICKS, parseSelection, serializeSelection } from "../src/share.js";

const ids = Array.from({ length: 10 }, (_, index) => `color-${index + 1}`);
const tokenToId = new Map(ids.map((id, index) => [`10${String(index + 1).padStart(3, "0")}`, id]));
const idToToken = new Map(ids.map((id, index) => [id, `10${String(index + 1).padStart(3, "0")}`]));

test("selection links use short color IDs and preserve order", () => {
  const selection = ["color-3", "color-1", "color-2"];
  const fragment = serializeSelection(selection, idToToken);
  assert.equal(fragment, "#v=1&p=10003,10001,10002");
  assert.deepEqual(parseSelection(fragment, tokenToId), selection);
});

test("pre-release link formats are not supported", () => {
  assert.deepEqual(parseSelection("#v=1&p=color-3,color-1", tokenToId), []);
  assert.deepEqual(parseSelection("#v=2&p=10003,10001", tokenToId), []);
});

test("unknown and duplicate IDs are ignored", () => {
  assert.deepEqual(
    parseSelection("#v=1&p=10002,missing,10002,10001", tokenToId),
    ["color-2", "color-1"],
  );
});

test("selection links enforce the pick limit", () => {
  const fragment = serializeSelection(ids, idToToken);
  assert.equal(parseSelection(fragment, tokenToId).length, MAX_PICKS);
});

test("empty and malformed fragments fail safely", () => {
  assert.deepEqual(parseSelection("", tokenToId), []);
  assert.deepEqual(parseSelection("#p=%E0%A4%A", tokenToId), []);
});
