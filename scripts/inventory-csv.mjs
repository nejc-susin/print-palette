// Turns the spreadsheet's published `site` tab (CSV: colorId,onHand,opened) into
// the public inventory. Only binary availability and opened state per color ID
// ever leave the sheet.

const EXPECTED_HEADER = ["colorId", "onHand", "opened"];

export function parseInventoryCsv(text, catalogColorIds) {
  if (/^\s*</.test(text)) {
    throw new Error("Got HTML instead of CSV. Is the `site` tab published to the web as CSV?");
  }

  const rows = text.trim().split(/\r?\n/).map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
  const header = rows.shift() ?? [];
  if (header.join(",") !== EXPECTED_HEADER.join(",")) {
    throw new Error(`Unexpected header "${header.join(",")}", expected "${EXPECTED_HEADER.join(",")}".`);
  }

  const known = new Set(catalogColorIds);
  const available = new Set();
  const opened = new Set();
  const ignored = [];

  for (const [colorId, onHand, isOpened] of rows) {
    if (!colorId) continue;
    if (!known.has(colorId)) {
      ignored.push(colorId);
      continue;
    }
    if (onHand === "TRUE") available.add(colorId);
    if (onHand === "TRUE" && isOpened === "TRUE") opened.add(colorId);
  }

  // Keep catalog order so the file diffs cleanly between syncs.
  const ordered = (ids) => catalogColorIds.filter((id) => ids.has(id));
  return {
    inventory: { schemaVersion: 3, availableColorIds: ordered(available), openedColorIds: ordered(opened) },
    ignored,
  };
}
