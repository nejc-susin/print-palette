# Print Palette

Print Palette is a small static site where friends can browse available Bambu Lab filament, choose up to eight colors, and share their ordered selection with one link.

## Features

- Bambu Lab PLA Basic, PLA Matte, PETG HF, and PETG Translucent catalog
- On-hand, opened-only, and full-catalog views
- Opened/sealed marker on every on-hand color
- Search and material filters
- Reorderable color selection
- Short, database-free share links using Bambu color IDs
- Responsive mobile and desktop layout

## Development

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

The local site runs at `http://localhost:3000`.

```bash
npm test
npm run build
npm run preview
```

`npm run build` writes the production site to `dist/`.

## Data

- `public/data/catalog.json` contains the public filament catalog, swatches, names, materials, and Bambu color IDs. Names and hex values come from Bambu Studio's `filaments_color_codes.json`. Translucent colors also carry an `opacity` (Clear is `0`).
- `public/data/inventory.json` contains the Bambu color IDs currently available and, of those, the IDs with at least one opened spool.

Stock comes from the private 3D printing spreadsheet. Its `site` tab uses formulas over the `filament` tab and exposes only `colorId,onHand,opened`: a color is on hand when any dated row for it is not `Depleted`, and opened when any dated row has status `Open`. Only the `site` tab is published to the web as CSV; never publish the whole document.

`npm run deploy` runs `npm run sync` first, which downloads that CSV and rewrites `inventory.json`. Set `INVENTORY_CSV_URL` in `.env.deploy`. IDs that are not in the catalog, such as ABS, are ignored. To deploy without syncing, run `SKIP_INVENTORY_SYNC=1 npm run deploy`.

```json
{
  "schemaVersion": 3,
  "availableColorIds": ["10100", "10200", "11603"],
  "openedColorIds": ["10100"]
}
```

Everything under `public/` is visible to visitors. Do not add quantities, prices, stores, or other private spreadsheet columns.

The original inventory labels `White` and `Charcoal Black` map to the catalog names `Jade White` and `Charcoal`. Duplicate inventory rows are intentionally collapsed to binary availability.

## Shared links

Selections are stored in the URL fragment:

```text
https://example.com/#v=1&p=10100,10200
```

`v=1` is the link format; `p` contains ordered Bambu color IDs. No server state or special Nginx routing is required.

## Deployment

Copy the generic configuration template and fill in your own server details:

```bash
cp deploy.env.example .env.deploy
npm run deploy
```

`.env.deploy` is ignored by Git. It contains the SSH host, user, destination path, port, and optional public URL. The deploy command builds the site and uploads `dist/` with `rsync`.

The committed template contains placeholders only. Keep actual domains, usernames, server addresses, and filesystem paths in `.env.deploy`.

Hashed files under `assets/` may be cached long-term. Keep `index.html` and `data/inventory.json` uncached or on a short cache so inventory updates appear promptly.
