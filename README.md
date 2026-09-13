# Logo Lab

An offline identity-design tool. Plain HTML, CSS and JavaScript — no framework,
no build step, no dependencies, no network requests. Opened directly from
`file://` by double-clicking `index.html`.

Everything you need while using the app is written into the interface itself.
This file documents the architecture and the constraints behind it.

---

## Purpose

A lab for exploring many logo concepts before committing to a personal brand
identity — not a tool for producing one finished logo. It optimises for
generating, comparing and saving alternatives quickly, then exporting the one
you settle on as a clean vector file.

---

## Architecture

One plain object, `state`, is the single source of truth. Nothing is ever read
back out of the DOM.

```
state ──▶ normalizeState() ──▶ renderer(ctx, frame) ──▶ buildSVG() ──▶ currentSVG
                                                                          │
        ┌────────┬─────────┬─────────┬──────────┬──────────────────┬──────┤
     light     dark     profile    header    watermark     gallery      Export
    (bg CSS) (bg CSS)  (crop CSS) (box CSS) (opacity CSS)  thumbnails  (SVG/PNG/zip)
```

`currentSVG` is one module-level string. All five preview frames receive it via
`innerHTML`. The SVG export writes that same variable. Preview frames differ
**only** in container width, height, background and opacity.

`normalizeState()` is the single choke point: it escapes text, clamps numbers,
resolves colours, and resolves monochrome, outline and adaptive-contrast modes
before any shape is drawn. Renderers do geometry only — they never escape,
never clamp, never read the DOM. Bugs of those classes can only live in one
place.

Renderers take `(ctx, frame)` where `frame` is `{cx, cy, size, scale}`. Being
frame-relative rather than canvas-relative is what lets the Lockup layout embed
any square mark without duplicating a line of geometry.

### File layout

| File | Purpose |
|---|---|
| `index.html` | Structure: control panel, preview stage, gallery |
| `style.css` | Application styling only — never touches the artwork |
| `script.js` | 16 commented sections; see the header comment |

`style.css` may set the *display size* of a preview frame and the `<svg>`
element inside it. It must never set fill, stroke, colour or font on the
artwork. That separation is what makes the single-string guarantee enforceable
rather than aspirational.

---

## Constraints

These are enforced by an automated browser test that checks all 56
combinations of style × render mode × gradient × monochrome.

1. **No `id` attributes in the artwork.** Several inline copies of different
   artwork share one document (five previews plus every gallery thumbnail).
   Duplicate ids collide: the browser resolves every `url(#id)` to the first
   matching element, so thumbnails would render with each other's paint.
2. **Therefore no gradients, filters, clip-paths or masks** in the SVG sense.
   Holes use `fill-rule="evenodd"`; gradients are banded (see below).
3. **No XML declaration.** Optional for SVG, and omitting it lets the identical
   string be injected with `innerHTML` *and* written to disk unchanged.
4. **No `dominant-baseline`.** Browsers and design programs disagree about it.
   Vertical text position is an explicit offset computed from font size.
5. **All text passes through `escapeXml()` once**, inside `normalizeState()`.
6. **Deterministic output.** Identical state always yields an identical string.
   Randomisation is seeded (`mulberry32`); `Math.random()` is never called
   during rendering.

---

## Features

### Styles
Monogram · Circular badge · Geometric symbol · Orbit symbol · Geometric avatar ·
Wordmark · Lockup (any mark plus name and tagline, beside or above).

The **Orbit symbol** is generative: node placement comes from a seeded PRNG, and
the seed is stored in state, so a concept fully describes its own artwork and
rebuilds identically forever.

### Banded gradients
A real SVG gradient needs `<linearGradient id>` and `fill="url(#id)"`. There is
no id-free syntax. Logo Lab synthesises the blend from N flat-filled shapes
instead, using two strategies:

- **Linear** — horizontal bands whose width follows the shape's own
  cross-section at that height. Exact for rounded rectangles and circles. No
  clipping and no knockout rectangle, so transparency survives.
- **Concentric** — the shape redrawn at decreasing scale. Used for polygons,
  where an exact cross-section through rounded corners is not worth the
  complexity.

Bands overlap slightly to prevent anti-aliasing hairlines. Gradients are
suppressed automatically in monochrome and outline modes, with an on-screen
explanation. **Gradients cannot be applied to text** — that needs a paint
server or glyph outlines, and neither is available.

### Outlines mode
Draws body shapes as stroked silhouettes. This is **not** text-to-outlines
conversion; see Known limitations.

### Adaptive contrast
Chooses the knockout colour for letters, eyes and mouths by measuring WCAG
contrast against the primary fill, rather than always using the background
colour. Off by default so concepts saved under schema v1 reload unchanged.

### Colour harmonizer
Derives all four colour slots from one base hue using complementary, analogous,
triadic, split-complementary or monochromatic relationships, and reports the
resulting contrast ratio so you can tell whether the result is legible.

### Export
- **SVG** — `currentSVG` verbatim. The canonical artefact.
- **PNG** — 1×, 2× or 4×, rasterised through a data URI.
- **Brand kit (.zip)** — `logo.svg`, `logo-monochrome.svg`, `logo-outline.svg`,
  `logo.png`, `palette.svg`, `brand.json`, `README.txt`. Written by a
  store-only ZIP writer (~100 lines, no dependency). Variants are produced by
  building from a modified *state*, never by post-processing the string, so the
  one-state-one-string rule holds for every file in the kit.

### Other
Undo/redo with drag coalescing (Ctrl+Z / Ctrl+Shift+Z) · Randomize concept ·
Gallery search by name and style · App light/dark/auto theme · Two independent
font stacks · Two-axis "fit text to canvas".

---

## Usage

Double-click `index.html`. That is the entire setup.

Keyboard: `Ctrl/Cmd+Z` undo, `Ctrl/Cmd+Shift+Z` or `Ctrl/Cmd+Y` redo. Ignored
while a text field has focus so the browser's own text undo keeps working.

---

## JSON import/export format

Gallery backup:

```json
{
  "app": "logo-lab",
  "version": 2,
  "exportedAt": "2026-09-13T21:12:32.000Z",
  "concepts": [
    {
      "id": "c_m1n2o3_x4y5z",
      "name": "Badge concept — gold ring",
      "savedAt": "2026-09-13T20:44:01.000Z",
      "schemaVersion": 2,
      "state": { "...": "the full state object" },
      "svg": "<svg …>"
    }
  ]
}
```

`brand.json` from a brand kit uses the same envelope with a single `state` in
place of `concepts`, and is accepted by the gallery importer.

**Validation and migration.** Import reports precisely what is wrong — not
valid JSON, valid JSON but not from Logo Lab, no concepts list, or *N* skipped
as unreadable — and offers merge or replace. Merge reassigns clashing ids so
nothing is silently overwritten. Every imported state is merged over the
current defaults, so a v1 concept keeps its own values and picks up defaults
for fields that did not exist yet. v2 defaults are chosen so v1 artwork
reproduces unchanged.

**Loading a concept rebuilds from its saved settings, not its saved picture**,
so renderer improvements reach older concepts. The stored SVG drives the
thumbnail and is the fallback if the settings fail validation. A concept may
therefore look slightly different from its thumbnail after a renderer change;
the gallery says so.

---

## Known limitations

- **Text-to-outlines is not possible here.** No browser API exposes glyph
  outlines. Doing it properly means parsing the font binary and having access
  to the font file — an external dependency and file access, both ruled out.
  Convert text to outlines in a design program before sending work to a printer.
- **Fonts.** Exported SVG references font *names*, not font data. A machine
  without the font substitutes another.
- **PNG is not reproducible across machines.** It bakes in whatever font this
  computer resolved from the stack. The SVG is the master.
- **Gradients cannot be applied to text**, and more bands means a larger file.
- **`localStorage`** is per-browser and per-computer, and some browsers restrict
  it on `file://`. The app shows a warning when storage is unavailable rather
  than pretending a save worked. Use the JSON backup for anything you want to
  keep.
- **Text fitting is manual and machine-dependent**, because only the browser can
  measure text and it uses this computer's fonts.
- **Colour interpolation is sRGB**, matching what SVG's own gradients do rather
  than what is perceptually ideal.

---

## Roadmap

Candidates, roughly in order of value against effort:

1. Side-by-side concept comparison from the gallery.
2. Favicon and app-icon export at standard sizes from the same string.
3. Per-concept notes and tags, with search extended to cover them.
4. Contrast audit across all five previews, flagging failures against WCAG.
5. Additional generative marks (grid, wave, isometric) using the seeded PRNG.
6. Optional real `<linearGradient>` output with content-hashed ids, as an
   opt-in export-only mode — hashed ids make duplicate definitions collide
   harmlessly while distinct ones stay separate. This would relax constraint 1
   for export while keeping previews banded.
7. Perceptual (OKLCH) colour interpolation and harmony.
