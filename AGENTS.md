# AGENTS.md

Operational guide for agents/tools/humans working in this repo. Keep it lean and
current. The *why* behind these choices lives in `docs/DECISIONS.md` (local, not
committed); this file is the self-contained *how*.

**Project:** Steam Version Freezer — a Windows desktop utility that "freezes" a game's
installed version in Steam (blocks updates while keeping the game launchable and Steam
online) by editing the game's `appmanifest_<APPID>.acf` to match the current public
build/manifests, then marking it read-only.

## Language rule (must follow)

Everything in the codebase is in **English** — no exceptions:

- identifiers (variables, functions, types, files),
- comments,
- string literals, **log / console messages**,
- **all UI text and HTML/markup** (labels, buttons, status lines),
- commit messages.

Conversation with the maintainer may be in another language, but **nothing non-English
ever lands in the code**.

## Commands & environment

- Package manager: **pnpm**.
- `pnpm start` — run the app in dev (electron-forge). Long-running, watch mode.
- `pnpm run make` — package/build the app.
- `pnpm run lint` — ESLint (flat config, `eslint.config.mjs`). Maintainer-run (see "Linting").

Gotchas:

- Forge's dev logger binds **port 9000** — only **one** `pnpm start` at a time, or it
  fails with `EADDRINUSE :::9000`.
- **Main-process** changes need a full restart (`Ctrl+C` then `pnpm start`); the renderer
  hot-reloads on its own.
- The app needs **Administrator** rights to write Steam files under `Program Files`. In
  dev, launch the terminal "As Administrator"; in prod it ships with
  `requireAdministrator`.

## Git

The maintainer manages git. **Do not run git commands** — `git status`, `git check-ignore`,
`git add`, `git commit`, `git diff`, tracking checks, etc. — unless a task explicitly asks
for git work. Create/edit files as the task needs and leave all git operations to the user.

## Type checking

Do not run type checks — don't invoke `tsc` / `pnpm exec tsc --noEmit` (or any equivalent).
The maintainer reviews type correctness in the IDE. Write correctly-typed code, but leave
type verification to them.

## Testing

No automated tests in this project. Don't add a test runner (vitest/jest/etc.) or write
test files; verification is manual (run the app and observe behavior).

## Linting

Don't run the linter — don't invoke `pnpm run lint` / `eslint`. The maintainer controls
linting in the IDE. Write code that follows the configured rules, but leave running the
linter to them. (ESLint 9 flat config in `eslint.config.mjs`; Prettier runs through ESLint
via `eslint-plugin-prettier`, style in `.prettierrc.json`.)

## Architecture

Electron secure defaults are kept (`contextIsolation: true`, `nodeIntegration: false`,
sandbox). Rationale is reliability/testability, not security.

- All privileged work runs in the **main** process behind `ipcMain.handle`.
- **preload is a thin bridge only**: `contextBridge.exposeInMainWorld('freezer', ...)`
  forwarding to `ipcRenderer.invoke`. No Node logic in preload.
- The **renderer** reaches main only through `window.freezer`. No direct
  `fs` / `child_process` / Node usage in the renderer.

Adding a bridge method (the pattern):

1. Add the signature to the `FreezerApi` type in `src/shared/api.ts`.
2. Implement the forwarder in `src/preload.ts` (`ipcRenderer.invoke('name', ...)`).
3. Register `ipcMain.handle('name', ...)` in the main process.

## Project structure

```
src/
  main/                 # main process (Node, full privileges)
    index.ts            # entry: app lifecycle + window creation
    ipc.ts              # registers all ipcMain.handle; handlers only forward to services
    services/           # domain logic — plain Node, no `import 'electron'`, unit-testable
                        #   (planned: acf, steamApi, steamPath, steamWatch, freezer)
  preload/
    index.ts            # thin contextBridge -> ipcRenderer.invoke bridge
  renderer/
    index.tsx           # entry: loads styles, mounts <App/> into #root
    App.tsx             # root component (composes the screen)
    index.html
    index.css           # Tailwind entry + theme
    components/         # presentational React components (added in the UI step)
    hooks/              # React hooks; the only place that touches window.freezer
  shared/
    api.ts              # FreezerApi — the bridge contract (type-only across the boundary)
                        #   (planned: channels.ts for IPC channel names, types.ts for DTOs)
  types/                # ambient/global declarations only (.d.ts)
    assets.d.ts         #   non-code imports (*.css, ...)
    vendor.d.ts         #   shims for untyped npm packages
    global.d.ts         #   global augmentations (e.g. window.freezer)
```

Rules:

- `main/services/*` must not import `electron`; keep them pure Node so they unit-test
  without launching Electron. Electron coupling lives only in `main/index.ts` and
  `main/ipc.ts`.
- The renderer reaches main only via `window.freezer`, and only through a hook in
  `renderer/hooks/` — components never call the bridge directly.
- Entry points are wired in `forge.config.ts` (renderer html/js + preload) and
  `webpack.main.config.ts` (main entry). Update those if you move an entry file.
- All ambient/global `.d.ts` (`declare module` / `declare global`) live in `src/types/`,
  grouped by kind (`assets` / `vendor` / `global`) — never colocated next to source, since
  ambient declarations apply globally regardless of file location.

Folders shown above that don't exist yet (`services/`, `components/`, `hooks/`) appear as
their step lands; this tree is the agreed target layout.

## Stack

- Electron Forge (webpack-typescript template), TypeScript.
- `@node-steam/vdf` for parsing/editing `.acf` (Valve VDF). **Do not write a custom parser.**
- HTTP: native `fetch` (no axios), wrapped in `steamApi` with an explicit `res.ok` check,
  `AbortController` timeout, and error mapping (`network` / `http` / `parse`).
- UI: React 19 + Tailwind v4 (renderer only). Tailwind runs via PostCSS
  (`postcss.config.js` → `@tailwindcss/postcss`); Steam-palette theme tokens live in
  `src/renderer/index.css` (`@theme`); JSX is enabled by `tsconfig` `"jsx": "react-jsx"`.

## React conventions

- Components are **arrow functions typed with `FC`** from React:
  `const Foo: FC<FooProps> = (props) => { ... }` — use bare `FC` (no type args) when the
  component takes no props. Import it as a type: `import { ..., type FC } from 'react'`.

## Domain safety rules (do not violate)

- Steam must be **fully closed** before writing any `.acf` (it holds state in memory and
  will overwrite the file otherwise).
- Always back up to `.acf.bak` **before** writing; if the backup fails, **do not write**.
- Mark the `.acf` **read-only** after freezing; remove read-only on unfreeze.
- **Never** trigger Steam's "verify integrity" on a frozen game.

## Known issues

- None currently.
