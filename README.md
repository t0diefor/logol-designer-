# Logo Lab

A personal logo design lab. Plain HTML, CSS and JavaScript — no framework, no
build step, no dependencies, no network requests.

## Running it

Double-click `index.html`. That is the whole setup. It runs from `file://`
with no local server.

All guidance, notes and limitations are written into the interface itself, so
there is nothing here you need to read before using it.

## Files

| File | Purpose |
|---|---|
| `index.html` | Structure: control panel, preview stage, gallery |
| `style.css` | Application styling only — never touches the logo artwork |
| `script.js` | State, SVG generation, previews, export, gallery, backup |

## The one rule that shapes the whole design

One application state object produces **one SVG string**. That single string is
injected into all five preview frames and is the exact content of the exported
file. The previews differ only in the CSS applied to their containers —
background colour, size and opacity. There is no second rendering path and no
CSS recreation of the logo, so the preview and the export cannot drift apart.

Two consequences follow from that, both deliberate:

- **No `id` attributes in the artwork**, and therefore no gradients, filters,
  clip-paths or masks. Five inline copies of the same id on one page collide.
  Flat fills only. Holes are made with `fill-rule="evenodd"`, which needs no id.
- **No XML declaration** in the exported file. It is optional for SVG, and
  omitting it lets the identical string be both injected into the page and
  written to disk unchanged.

## Known limitations

- **Fonts.** Exported SVG references font *names*, not font data. A machine
  without the font substitutes something else. Convert text to outlines in a
  design program before sending anything to a printer.
- **Gallery storage.** `localStorage` is per-browser and per-computer, and some
  browsers restrict it on `file://` pages. A warning appears in the app if
  storage is unavailable. Use the JSON backup for anything you want to keep.
- **Text fitting.** Text width can only be measured by the browser, using the
  fonts on this computer. Fitting is therefore manual — press *Fit text to
  canvas* — and the resulting size is stored like any other setting.

## Not included in v1

PNG/JPG export, font uploading, text-to-outline conversion, undo/redo.
