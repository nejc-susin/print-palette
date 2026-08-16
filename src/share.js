export const MAX_PICKS = 8;

/**
 * @param {string} fragment
 * @param {ReadonlyMap<string, string>} tokenToId
 * @returns {string[]}
 */
export function parseSelection(fragment, tokenToId) {
  const params = new URLSearchParams(fragment.replace(/^#/, ""));
  const version = params.get("v");
  const raw = params.get("p");

  if (version !== "1" || !raw) return [];

  /** @type {string[]} */
  const unique = [];
  for (const token of raw.split(",")) {
    const id = tokenToId.get(token);
    if (id && !unique.includes(id)) unique.push(id);
    if (unique.length === MAX_PICKS) break;
  }
  return unique;
}

/**
 * @param {string[]} ids
 * @param {ReadonlyMap<string, string>} idToToken
 * @returns {string}
 */
export function serializeSelection(ids, idToToken) {
  const tokens = [...new Set(ids)]
    .map((id) => idToToken.get(id))
    .filter((token) => token !== undefined)
    .slice(0, MAX_PICKS);
  if (tokens.length === 0) return "";
  return `#v=1&p=${tokens.map(encodeURIComponent).join(",")}`;
}
