# Print Palette

Print Palette is a small static site where friends can browse available Bambu Lab filament, choose up to eight colors, and share their ordered selection with one link.

## Features

- Bambu Lab PLA Basic and PLA Matte catalog
- On-hand, opened-only, and full-catalog views
- Opened/sealed marker on every on-hand color
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
- `public/data/inventory.json` contains the Bambu color IDs currently available and, of those, the IDs with at least one opened spool.

To update stock, edit `availableColorIds` and `openedColorIds`. Both come from the `filament` tab of the private 3D printing spreadsheet: a color is available when any PLA Basic/Matte row for it is not `Depleted`, and opened when any of those rows has status `Open`.

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
