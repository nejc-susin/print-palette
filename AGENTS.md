# Print Palette

Static filament picker. Friends choose up to eight colors and share the ordered selection by URL. It is not a shop; do not add prices, checkout, accounts, reservations, or payments.

## Product rules

- v1 supports Bambu Lab PLA Basic and PLA Matte only.
- Show available colors by default; the full catalog clearly marks availability.
- Never mute the swatch itself. Unavailable cards may mute only their information panel.
- Show the finish, official color name, hex swatch, and five-digit Bambu color ID.
- My Picks is a flat, reorderable list of up to eight unique colors.
- Shared links use `#v=1&p=10100,10200`; order is preserved.
- Ignore malformed, duplicate, and unknown IDs safely. No pre-release link compatibility is required.
- Public data exposes only binary availability—never quantity, condition, price, or purchase data.

## Data

- `public/data/catalog.json`: complete public Basic and Matte catalog.
- `public/data/inventory.json`: currently available Bambu IDs in `availableColorIds`.
- Keep private spreadsheet data out of the site and production build.

## Implementation

- Vanilla TypeScript, Vite, semantic HTML, and custom CSS.
- No framework, database, backend, authentication, analytics, or runtime third-party assets.
- Production output is the static `dist/` directory for Nginx.

Before finishing changes, run `npm test` and `npm run build`. Check selection restoration and relevant mobile/desktop states when UI behavior changes.
