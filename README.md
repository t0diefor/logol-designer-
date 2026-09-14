# PanelForge

Plan, write, design and export comic books. React + TypeScript, local-first.

Full documentation is published as a web page (see the link in the build notes)
so it can be read without a Markdown viewer.

## Requirements

- Node.js 20.19+ or 22.12+
- npm 10+

## Setup

```bash
npm install
npm run dev          # http://localhost:5173
```

No API keys, no account and no backend are needed to run the app. Everything is
stored in the browser.

### Looking around

On first run the app is empty, which makes it hard to judge. Press **Load the
sample project** on the dashboard (or in Settings) to fill one project with
characters, a world, a timeline and a script, so every screen has something in
it. It is an ordinary project and deleting it works like any other.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Type-check, then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | TypeScript project build, no emit |
| `npm run lint` | ESLint over the whole repo |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run verify:ui` | Drive a real browser, screenshot every theme (needs `npm run dev` running) |
| `npm run check` | typecheck + lint + test + build, in that order |
| `npm run build:static` | Build to `dist-static/` with hash routing, for any plain static host |

## Environment variables

Copy `.env.example` to `.env` only when you reach the phases that need it.
Phase 1 requires nothing. Anything prefixed `VITE_` is embedded in the browser
bundle and is therefore public; secrets must never use that prefix.

## Project status

Built in verified phases. Phase 1 (shell, routing, six-theme system, layout,
local persistence) is complete. Areas scheduled for later phases are reachable
in the navigation and state plainly that they are not built yet, rather than
presenting controls that do nothing.

| Phase | Area | Status |
| --- | --- | --- |
| 1 | Shell, routing, themes, persistence | Complete |
| 2 | Character Builder | Not started |
| 3 | World Builder | Not started |
| 4 | Story Editor | Not started |
| 5 | Asset Library | Not started |
| 6 | Comic Page and Panel Composer | Not started |
| 7 | PNG and PDF export | Not started |
| 8 | AI tools and provider abstraction | Not started |
| 9 | Backend, database, storage, auth | Not started |
| 10 | Testing, accessibility, performance | Not started |

## Architecture notes

- **State** lives in Zustand stores under `src/stores/`. Derived lists are
  memoised hooks in `workspace-selectors.ts`, never inline selectors -- see the
  comment in that file for why.
- **Persistence** is IndexedDB via `src/lib/idb.ts`, not localStorage, which
  caps at ~5MB. localStorage holds only theme preferences.
- **Themes** are semantic tokens in `src/theme/`. Components reference roles
  (`bg-surface`, `text-ink-muted`), never raw colours. `contrast.test.ts`
  enforces WCAG AA across all six themes in CI.
- **Types** are Zod schemas in `src/types/`, with TypeScript types inferred
  from them so a validator and its type cannot drift apart.
