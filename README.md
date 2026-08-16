# Print Palette

Print Palette is a small static site where friends can browse available Bambu Lab filament, choose up to eight colors, and share their ordered selection with one link.

## Features

- Bambu Lab PLA Basic and PLA Matte catalog
- Available-only and full-catalog views
- Search, finish, and color-family filters
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

- `public/data/catalog.json` contains the public filament catalog, swatches, names, finishes, and Bambu color IDs.
- `public/data/inventory.json` contains only the Bambu color IDs currently available.

To update availability, edit `availableColorIds`:

```json
{
  "schemaVersion": 2,
  "availableColorIds": ["10100", "10200", "11603"]
}
```

Everything under `public/` is visible to visitors. Do not add quantities, opened/sealed state, prices, or private spreadsheet columns.

The original inventory labels `White` and `Charcoal Black` map to the catalog names `Jade White` and `Charcoal`. Duplicate inventory rows are intentionally collapsed to binary availability.

## Shared links

Selections are stored in the URL fragment:

```text
https://example.com/#v=1&p=10100,10200
```

`v=1` is the link format; `p` contains ordered Bambu color IDs. No server state or special Nginx routing is required.

## Deployment

Run `npm run build`, then copy the contents of `dist/` to your web server's document root.

Hashed files under `assets/` may be cached long-term. Keep `index.html` and `data/inventory.json` uncached or on a short cache so inventory updates appear promptly.
