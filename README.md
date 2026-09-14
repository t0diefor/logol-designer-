# PanelForge

Plan, write, design and export comic books. React + TypeScript, local-first.

Full documentation is published as a web page (see the link in the build notes)
so it can be read without a Markdown viewer.

## Requirements

- Node.js 20.19+ or 22.12+
- npm 10+

## Setup

Every command below runs **inside the project folder**. Running them anywhere
else gives `Could not read package.json`, which just means you are in the wrong
directory.

### Windows (PowerShell)

Paste one line at a time:

```powershell
cd $HOME\Documents
git clone https://github.com/t0diefor/logol-designer- panelforge
cd panelforge
git checkout claude/intelligent-ride-9vahag
$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
npm install
npm run dev
```

Then open <http://localhost:5173>. Press `Ctrl+C` in the terminal to stop it.

To come back later, open PowerShell and run `cd $HOME\Documents\panelforge`
followed by `npm run dev`. The clone and install are one-time.

### macOS / Linux

```bash
cd ~/Documents
git clone https://github.com/t0diefor/logol-designer- panelforge
cd panelforge
git checkout claude/intelligent-ride-9vahag
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
npm run dev
```

### Why the Playwright line

`playwright` is a development dependency used by `npm run verify:ui`. Without
that variable, installing it also downloads a ~150 MB browser you do not need
in order to run the app. Set it and the install takes seconds. If you later
want `verify:ui`, run `npx playwright install chromium`.

### No `git`?

If `git --version` fails, either install Git for Windows from
<https://git-scm.com/download/win>, or download the code as a ZIP: open the
repository on GitHub, switch the branch dropdown to
`claude/intelligent-ride-9vahag`, then **Code → Download ZIP**. Extract it,
`cd` into the extracted folder, and continue from `npm install`.

No API keys, no account and no backend are needed to run the app. Everything is
stored in the browser.

### Troubleshooting

| Message | Cause | Fix |
| --- | --- | --- |
| `Could not read package.json` | You are not in the project folder | `cd` into it first |
| `git` is not recognised | Git is not installed | Install Git, or use the ZIP route above |
| `Unsupported engine` / syntax errors on install | Node is too old | Install Node 20.19+ or 22.12+ from <https://nodejs.org> |
| Install hangs on "Downloading Chromium" | Playwright fetching a browser | Cancel, set the skip variable above, run `npm install` again |
| Port 5173 already in use | Another dev server is running | `npm run dev -- --port 5174` |

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
