import "./styles.css";
import { MAX_PICKS, parseSelection, serializeSelection } from "./share.js";

interface Filament {
  id: string;
  colorId: string;
  material: "PLA" | "PETG";
  type: "Basic" | "Matte" | "HF" | "Translucent";
  name: string;
  hex: string;
  family: string;
  /** Translucent filament only: 0 is fully clear, 1 would be opaque. */
  opacity?: number;
}

interface CatalogData {
  filaments: Filament[];
}

interface InventoryData {
  availableColorIds: string[];
  openedColorIds?: string[];
}

type ViewMode = "available" | "opened" | "all";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root not found");

let catalog: Filament[] = [];
let availableIds = new Set<string>();
let openedIds = new Set<string>();
let selectedIds: string[] = [];
let urlTokenToId = new Map<string, string>();
let idToUrlToken = new Map<string, string>();
let viewMode: ViewMode = "available";
let lineFilter = "All";
let searchTerm = "";
let panelOpen = false;
let toastTimer = 0;
let previousFocus: HTMLElement | null = null;

const mobileLayout = window.matchMedia("(max-width: 1023px)");

/** Plain-language guide for people who don't print. `line` must match lineName(). */
const MATERIAL_GUIDE = [
  {
    line: "PLA Basic",
    tagline: "The everyday choice",
    body: "Smooth, slightly shiny, crisp detail, and the most colors.",
    bestFor: "decorations, figurines, gifts, desk items",
    watchOut: "Softens around 55 °C, so not for hot cars, dishwashers, or a summer outdoors.",
  },
  {
    line: "PLA Matte",
    tagline: "PLA with a soft, non-shiny finish",
    body: "Hides layer lines and looks a little more premium.",
    bestFor: "display pieces, models, signs, anything you mostly look at",
    watchOut: "Same heat limit as PLA Basic, and a bit more brittle.",
  },
  {
    line: "PETG HF",
    tagline: "The tough, practical one",
    body: "Stronger, bends a little instead of snapping, and copes with heat (around 70 °C), water and sun. HF just means it prints faster.",
    bestFor: "hooks, clips, holders, car and outdoor parts",
    watchOut: "Slightly glossy, with fewer colors to choose from.",
  },
  {
    line: "PETG Translucent",
    tagline: "Lets light through",
    body: "Tinted and frosted rather than glass-clear; even Clear prints look hazy. As tough as PETG HF.",
    bestFor: "lamp shades, light diffusers, night lights, decorative vases",
    watchOut: "Fine details and text are harder to see.",
  },
];

app.innerHTML = `
  <div class="page-shell">
    <header class="hero">
      <nav class="topbar" aria-label="Main navigation">
        <a class="brand" href="/" aria-label="Print Palette home">
          <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <span>Print Palette</span>
        </a>
        <button class="top-picks" type="button" data-action="open-picks" aria-controls="picks-panel" aria-expanded="false">
          <span>My Picks</span><strong data-pick-count>0 / ${MAX_PICKS}</strong>
        </button>
      </nav>

      <div class="hero-content">
        <h1>Pick the colors.<br /><em>I’ll handle the printing.</em></h1>
        <p class="hero-copy">Browse the filament I have on hand, collect the colors you like, and send me one simple link.</p>
        <div class="hero-facts" aria-label="Catalog summary">
          <span><strong id="available-total">—</strong> colors on hand</span>
          <span><strong id="opened-total">—</strong> already opened</span>
          <span><strong id="line-total">—</strong> filament types</span>
        </div>
      </div>
    </header>

    <main class="content-layout">
      <section class="catalog-section" aria-label="Filament colors">
        <div class="toolbar" aria-label="Filament filters">
          <label class="search-field">
            <span>Search colors</span>
            <input id="search" type="search" placeholder="Try “blue” or “green”" autocomplete="off" />
          </label>
          <div class="filter-group">
            <span class="filter-label">Filter</span>
            <div class="segmented-control">
              <button type="button" data-view="available" aria-pressed="true">On hand</button>
              <button type="button" data-view="opened" aria-pressed="false">Opened</button>
              <button type="button" data-view="all" aria-pressed="false">Full catalog</button>
            </div>
          </div>
          <label class="select-field"><span>Material</span><select id="line-filter"><option>All</option></select></label>
        </div>

        <details class="material-guide">
          <summary>Which material should I pick?</summary>
          <div class="guide-grid">
            ${MATERIAL_GUIDE.map((entry) => `
              <section class="guide-card">
                <h3>${entry.line}</h3>
                <p class="guide-tagline">${entry.tagline}</p>
                <p>${entry.body}</p>
                <p><strong>Best for:</strong> ${entry.bestFor}.</p>
                <p class="guide-watch">${entry.watchOut}</p>
                <button type="button" data-action="show-line" data-line="${entry.line}">Show ${entry.line} colors</button>
              </section>`).join("")}
          </div>
          <p class="guide-footnote">Not sure? Pick the colors you like and tell me what the print is for. I’ll say if another material would suit it better. None of these are food-safe as printed, so skip cups and plates.</p>
        </details>

        <div class="result-line" aria-live="polite">
          <strong id="result-count">Loading colors…</strong>
          <span id="view-description">Showing filament currently on hand</span>
        </div>
        <div id="gallery" class="gallery" aria-busy="true"></div>
      </section>

      <aside id="picks-panel" class="picks-panel" aria-labelledby="picks-title">
        <div class="picks-header">
          <div><p class="section-kicker">Your color shortlist</p><h2 id="picks-title">My Picks <span data-pick-count>0 / ${MAX_PICKS}</span></h2></div>
          <button class="close-panel" type="button" data-action="close-picks" aria-label="Close My Picks">×</button>
        </div>
        <div id="picks-content"></div>
      </aside>
    </main>

  </div>

  <button class="panel-backdrop" type="button" data-action="close-picks" aria-label="Close My Picks" hidden></button>
  <button class="mobile-picks-bar" type="button" data-action="open-picks" aria-controls="picks-panel" aria-expanded="false">
    <span class="mobile-picks-copy"><small>Your selection</small><strong>My Picks</strong></span>
    <span class="mobile-swatches" id="mobile-swatches" aria-hidden="true"></span>
    <b data-pick-count>0 / ${MAX_PICKS}</b>
  </button>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
`;

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

const gallery = requireElement<HTMLDivElement>("#gallery");
const picksContent = requireElement<HTMLDivElement>("#picks-content");
const picksPanel = requireElement<HTMLElement>("#picks-panel");
const backdrop = requireElement<HTMLButtonElement>(".panel-backdrop");
const toast = requireElement<HTMLDivElement>("#toast");

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);
}

function hexToRgb(hex: string): number[] {
  return [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
}

/** Translucent swatches sit on a light checkerboard, so judge contrast against the blend. */
function readableInk(filament: Filament): "#171816" | "#ffffff" {
  const alpha = filament.opacity ?? 1;
  const rgb = hexToRgb(filament.hex).map((channel) => channel * alpha + 240 * (1 - alpha));
  const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return luminance > 0.58 ? "#171816" : "#ffffff";
}

function swatchStyle(filament: Filament): string {
  if (filament.opacity === undefined) return `--swatch:${filament.hex}`;
  return `--swatch:rgb(${hexToRgb(filament.hex).join(" ")} / ${filament.opacity})`;
}

function swatchClass(filament: Filament): string {
  return filament.opacity === undefined ? "" : " is-translucent";
}

function lineName(filament: Filament): string {
  return `${filament.material} ${filament.type}`;
}

function filamentById(id: string): Filament | undefined {
  return catalog.find((filament) => filament.id === id);
}

function stockLabel(id: string): string {
  if (openedIds.has(id)) return `<span class="stock-label is-opened">Opened</span>`;
  if (!availableIds.has(id)) return `<span class="stock-label is-unavailable">Not on hand</span>`;
  return `<span class="stock-label is-sealed">Sealed</span>`;
}

function renderGallery(): void {
  const query = searchTerm.trim().toLowerCase();
  const filtered = catalog.filter((filament) => {
    if (viewMode === "available" && !availableIds.has(filament.id)) return false;
    if (viewMode === "opened" && !openedIds.has(filament.id)) return false;
    if (lineFilter !== "All" && lineName(filament) !== lineFilter) return false;
    return !query || `${filament.name} ${lineName(filament)} ${filament.family}`.toLowerCase().includes(query);
  });

  requireElement<HTMLElement>("#result-count").textContent = `${filtered.length} ${filtered.length === 1 ? "color" : "colors"}`;
  requireElement<HTMLElement>("#view-description").textContent = {
    available: "Showing filament currently on hand",
    opened: "Showing spools that are already open",
    all: `Showing all ${catalog.length} colors in the catalog`,
  }[viewMode];

  if (filtered.length === 0) {
    gallery.innerHTML = `<div class="empty-gallery"><strong>No colors match those filters.</strong><span>Try a different search or show the full catalog.</span></div>`;
    gallery.setAttribute("aria-busy", "false");
    return;
  }

  gallery.innerHTML = filtered.map((filament) => {
    const isAvailable = availableIds.has(filament.id);
    const selectedIndex = selectedIds.indexOf(filament.id);
    const isSelected = selectedIndex >= 0;
    const atLimit = selectedIds.length >= MAX_PICKS && !isSelected;
    const buttonLabel = isSelected ? "Remove" : atLimit ? "Limit reached" : "Add to my picks";

    return `
      <article class="filament-card${isSelected ? " is-selected" : ""}${isAvailable ? "" : " is-unavailable"}">
        <div class="swatch${swatchClass(filament)}" style="${swatchStyle(filament)};--swatch-ink:${readableInk(filament)}">
          <span class="finish-badge">${escapeHtml(lineName(filament))}</span>
          ${isSelected ? `<span class="pick-number">Pick ${selectedIndex + 1}</span>` : ""}
          ${filament.opacity === 0 ? "" : `<span class="hex-code">${filament.hex}</span>`}
        </div>
        <div class="card-copy">
          <h3>${escapeHtml(filament.name)}</h3>
          <span class="color-id">Bambu color ID ${escapeHtml(filament.colorId)}</span>
          ${stockLabel(filament.id)}
          <button type="button" data-action="toggle-pick" data-id="${escapeHtml(filament.id)}" ${!isAvailable || atLimit ? "disabled" : ""} aria-label="${escapeHtml(buttonLabel)}: ${escapeHtml(filament.name)}">
            ${buttonLabel}<span class="pick-icon${isSelected ? " is-minus" : ""}" aria-hidden="true"></span>
          </button>
        </div>
      </article>`;
  }).join("");
  gallery.setAttribute("aria-busy", "false");
}

function renderPicks(): void {
  document.querySelectorAll<HTMLElement>("[data-pick-count]").forEach((element) => {
    element.textContent = `${selectedIds.length} / ${MAX_PICKS}`;
  });

  const selected = selectedIds.map(filamentById).filter((item): item is Filament => Boolean(item));
  const hasUnavailable = selected.some((filament) => !availableIds.has(filament.id));

  if (selected.length === 0) {
    picksContent.innerHTML = `<div class="empty-picks"><span class="empty-picks-mark" aria-hidden="true">＋</span><strong>Your palette is empty</strong><p>Add a color from the shelf. You can collect up to ${MAX_PICKS}.</p></div>`;
  } else {
    picksContent.innerHTML = `
      ${hasUnavailable ? `<p class="selection-warning">One or more shared colors are no longer on hand.</p>` : ""}
      <ol class="pick-list">
        ${selected.map((filament, index) => `
          <li class="pick-item${availableIds.has(filament.id) ? "" : " is-unavailable"}">
            <span class="pick-index">${index + 1}</span>
            <span class="pick-swatch${swatchClass(filament)}" style="${swatchStyle(filament)}"></span>
            <span class="pick-name"><strong>${escapeHtml(filament.name)}</strong><small>${escapeHtml(lineName(filament))}${availableIds.has(filament.id) ? "" : " · Not on hand"}</small></span>
            <span class="pick-actions">
              <button type="button" data-action="move-up" data-id="${filament.id}" ${index === 0 ? "disabled" : ""} aria-label="Move ${escapeHtml(filament.name)} up">↑</button>
              <button type="button" data-action="move-down" data-id="${filament.id}" ${index === selected.length - 1 ? "disabled" : ""} aria-label="Move ${escapeHtml(filament.name)} down">↓</button>
              <button type="button" data-action="remove-pick" data-id="${filament.id}" aria-label="Remove ${escapeHtml(filament.name)}">×</button>
            </span>
          </li>`).join("")}
      </ol>
      <p class="spool-tip">Opened spools are ideal for prints under about 100&nbsp;g. For bigger prints, I’m happy to open a new color.</p>
      <div class="picks-footer">
        <button class="share-button" type="button" data-action="share">Copy selection link <span aria-hidden="true">↗</span></button>
        <button class="clear-button" type="button" data-action="clear">Clear all</button>
      </div>`;
  }

  requireElement<HTMLElement>("#mobile-swatches").innerHTML = selected.slice(0, 5).map((filament) => `<i class="${swatchClass(filament).trim()}" style="${swatchStyle(filament)}"></i>`).join("");
}

function renderAll(): void {
  renderGallery();
  renderPicks();
}

function syncUrl(): void {
  const url = new URL(window.location.href);
  url.hash = serializeSelection(selectedIds, idToUrlToken);
  window.history.replaceState(null, "", url);
}

function updateSelection(next: string[], message?: string): void {
  selectedIds = [...new Set(next)].slice(0, MAX_PICKS);
  syncUrl();
  renderAll();
  if (message) announce(message);
}

function announce(message: string): void {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function togglePick(id: string): void {
  const filament = filamentById(id);
  if (!filament || !availableIds.has(id)) return;
  if (selectedIds.includes(id)) {
    updateSelection(selectedIds.filter((selectedId) => selectedId !== id), `${filament.name} removed`);
  } else if (selectedIds.length >= MAX_PICKS) {
    announce(`You can pick up to ${MAX_PICKS} colors.`);
  } else {
    updateSelection([...selectedIds, id], `${filament.name} added`);
  }
}

function removePick(id: string): void {
  const filament = filamentById(id);
  if (!filament || !selectedIds.includes(id)) return;
  updateSelection(selectedIds.filter((selectedId) => selectedId !== id), `${filament.name} removed`);
}

function movePick(id: string, direction: -1 | 1): void {
  const index = selectedIds.indexOf(id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= selectedIds.length) return;
  const next = [...selectedIds];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  updateSelection(next);
}

async function copySelectionLink(): Promise<void> {
  if (selectedIds.length === 0) return;
  syncUrl();
  const link = window.location.href;
  try {
    await navigator.clipboard.writeText(link);
  } catch {
    const field = document.createElement("textarea");
    field.value = link;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }
  announce("Selection link copied");
}

function setPanelOpen(open: boolean): void {
  panelOpen = open;
  const isMobile = mobileLayout.matches;
  picksPanel.classList.toggle("is-open", open && isMobile);
  backdrop.hidden = !(open && isMobile);
  document.body.classList.toggle("panel-open", open && isMobile);
  document.querySelectorAll<HTMLButtonElement>("[data-action='open-picks']").forEach((button) => button.setAttribute("aria-expanded", String(open && isMobile)));
  picksPanel.toggleAttribute("inert", isMobile && !open);

  if (open && isMobile) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    requireElement<HTMLButtonElement>(".close-panel").focus();
  } else if (!open && previousFocus) {
    previousFocus.focus();
    previousFocus = null;
  }
}

function showLine(line: string): void {
  const select = requireElement<HTMLSelectElement>("#line-filter");
  select.value = line;
  lineFilter = select.value === line ? line : "All";
  renderGallery();
  requireElement<HTMLElement>(".result-line").scrollIntoView({ behavior: "smooth", block: "start" });
}

function openPicks(): void {
  if (mobileLayout.matches) setPanelOpen(true);
  else picksPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!button) return;

  if (button.dataset.view) {
    viewMode = button.dataset.view as ViewMode;
    document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((viewButton) => viewButton.setAttribute("aria-pressed", String(viewButton.dataset.view === viewMode)));
    renderGallery();
    return;
  }

  const id = button.dataset.id;
  switch (button.dataset.action) {
    case "toggle-pick": if (id) togglePick(id); break;
    case "remove-pick": if (id) removePick(id); break;
    case "move-up": if (id) movePick(id, -1); break;
    case "move-down": if (id) movePick(id, 1); break;
    case "clear": updateSelection([], "Selection cleared"); break;
    case "share": void copySelectionLink(); break;
    case "open-picks": openPicks(); break;
    case "close-picks": setPanelOpen(false); break;
    case "show-line": if (button.dataset.line) showLine(button.dataset.line); break;
  }
});

requireElement<HTMLInputElement>("#search").addEventListener("input", (event) => {
  searchTerm = (event.target as HTMLInputElement).value;
  renderGallery();
});
requireElement<HTMLSelectElement>("#line-filter").addEventListener("change", (event) => {
  lineFilter = (event.target as HTMLSelectElement).value;
  renderGallery();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && panelOpen) setPanelOpen(false);
});
mobileLayout.addEventListener("change", () => setPanelOpen(false));
window.addEventListener("hashchange", () => {
  const fromUrl = parseSelection(window.location.hash, urlTokenToId);
  if (fromUrl.join("|") !== selectedIds.join("|")) {
    selectedIds = fromUrl;
    renderAll();
  }
});

async function loadData(): Promise<void> {
  try {
    const [catalogResponse, inventoryResponse] = await Promise.all([fetch("/data/catalog.json"), fetch("/data/inventory.json")]);
    if (!catalogResponse.ok || !inventoryResponse.ok) throw new Error("Data files could not be loaded");
    const catalogData = await catalogResponse.json() as CatalogData;
    const inventoryData = await inventoryResponse.json() as InventoryData;
    if (!Array.isArray(catalogData.filaments) || !Array.isArray(inventoryData.availableColorIds)) throw new Error("Unexpected data format");

    catalog = catalogData.filaments;
    const availableColorIds = new Set(inventoryData.availableColorIds);
    const openedColorIds = new Set(Array.isArray(inventoryData.openedColorIds) ? inventoryData.openedColorIds : []);
    availableIds = new Set(catalog.filter((filament) => availableColorIds.has(filament.colorId)).map((filament) => filament.id));
    openedIds = new Set(catalog.filter((filament) => availableIds.has(filament.id) && openedColorIds.has(filament.colorId)).map((filament) => filament.id));
    urlTokenToId = new Map(catalog.map((filament) => [filament.colorId, filament.id]));
    idToUrlToken = new Map(catalog.map((filament) => [filament.id, filament.colorId]));
    selectedIds = parseSelection(window.location.hash, urlTokenToId);

    requireElement<HTMLElement>("#available-total").textContent = String(availableIds.size);
    requireElement<HTMLElement>("#opened-total").textContent = String(openedIds.size);
    const lines = [...new Set(catalog.map(lineName))];
    requireElement<HTMLElement>("#line-total").textContent = String(lines.length);
    requireElement<HTMLSelectElement>("#line-filter").insertAdjacentHTML("beforeend", lines.map((line) => `<option>${escapeHtml(line)}</option>`).join(""));
    syncUrl();
    renderAll();
    setPanelOpen(false);
  } catch (error) {
    console.error(error);
    gallery.innerHTML = `<div class="load-error"><strong>The filament shelf couldn’t be loaded.</strong><span>Please refresh the page and try again.</span></div>`;
    gallery.setAttribute("aria-busy", "false");
  }
}

void loadData();
