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

## Dependencies

The maintainer installs dependencies. **Do not run** `pnpm add` / `pnpm install` /
`pnpm remove` — when a task needs a package, give the exact command and let them run it.

## Type checking

Do not run type checks — don't invoke `tsc` / `pnpm exec tsc --noEmit` (or any equivalent).
The maintainer reviews type correctness in the IDE. Write correctly-typed code, but leave
type verification to them.

The webpack build is **transpile-only** by design: `ts-loader` runs with `transpileOnly: true`
and there is **no** `ForkTsCheckerWebpackPlugin` (`webpack.plugins.ts`). So type errors never
fail the build or print to the terminal — don't re-add a build-time type-checker. (`strict`
is on in `tsconfig.json` for IDE checking.)

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
2. Implement the forwarder in `src/preload/index.ts` (`ipcRenderer.invoke('name', ...)`).
3. Register `ipcMain.handle('name', ...)` in `src/main/ipc.ts`.

## Project structure

```
src/
  main/                 # main process (Node, full privileges)
    index.ts            # entry: app lifecycle + window creation
    ipc.ts              # registers all ipcMain.handle; handlers only forward to services
    windowState.ts      # persist/restore main-window bounds (electron glue: app/screen/BrowserWindow)
    services/           # domain logic — plain Node, no `import 'electron'`, unit-testable
      acf.ts            #   read/parse appmanifest_<appId>.acf (via ./vdf)
      freezer.ts        #   freeze (snapshot+lock), manifest rewrite, unfreeze restore (atomic writes, backup, Steam-closed guard)
      steamApi.ts       #   public buildid + depot manifests from api.steamcmd.net
      steamPath.ts      #   default steamapps path from the Windows registry (reg query)
      steamWatch.ts     #   is Steam running? (tasklist) — write guard
      vdf.ts            #   vendored Valve VDF parse/stringify (lossless: values stay raw strings)
  preload/
    index.ts            # thin contextBridge -> ipcRenderer.invoke bridge
  renderer/
    index.tsx           # entry: loads styles, mounts <App/> into #root
    App.tsx             # root component (composes the screen)
    index.html
    index.css           # Tailwind entry + theme
    components/         # presentational React components
    hooks/              # React hooks; the only place that touches window.freezer
    lib/                # renderer-only helpers (e.g. cn() for className composition)
  shared/
    api.ts              # FreezerApi — the bridge contract (type-only across the boundary)
    types.ts            # domain DTOs crossing the bridge (AppManifest, AcfResult, …)
                        #   (planned: channels.ts for IPC channel names)
  types/                # ambient/global declarations only (.d.ts)
    assets.d.ts         #   non-code imports (*.css, ...)
    vendor.d.ts         #   shims for untyped npm packages
    global.d.ts         #   global augmentations (e.g. window.freezer)
```

Rules:

- `main/services/*` must not import `electron`; keep them pure Node so they unit-test
  without launching Electron. Electron coupling stays out of `services/` — it lives in
  `main/index.ts`, `main/ipc.ts`, and dedicated electron-glue modules at `main/*` (e.g.
  `main/windowState.ts`) for cohesive window/lifecycle concerns that genuinely need
  `app`/`screen`/`BrowserWindow`. The invariant is `services/` purity, not a fixed file list.
- The renderer reaches main only via `window.freezer`, and only through a hook in
  `renderer/hooks/` — components never call the bridge directly.
- Entry points are wired in `forge.config.ts` (renderer html/js + preload) and
  `webpack.main.config.ts` (main entry). Update those if you move an entry file.
- All ambient/global `.d.ts` (`declare module` / `declare global`) live in `src/types/`,
  grouped by kind (`assets` / `vendor` / `global`) — never colocated next to source, since
  ambient declarations apply globally regardless of file location.

All `services/` modules now exist; this is the agreed layout.

## Stack

- Electron Forge (webpack-typescript template), TypeScript.
- VDF (`.acf`) parsing/editing uses a **vendored** copy of `@node-steam/vdf` at
  `main/services/vdf.ts` (MIT, attribution in the file header). The one change vs upstream: values
  are kept as **raw strings** (no number/bool coercion). Upstream coerced `"12345"` → number, which
  truncated integers > 2^53 (e.g. depot manifest gids) and corrupted them on a parse → stringify
  round-trip (node-steam/vdf#15) — unacceptable since we rewrite `.acf` in place. **Don't hand-roll
  a new parser, and don't re-add value coercion to `vdf.ts`.**
- HTTP: native `fetch` (no axios), wrapped in `steamApi` with an explicit `res.ok` check,
  `AbortController` timeout, and error mapping (`network` / `http` / `parse`).
- UI: React 19 + Tailwind v4 (renderer only). Tailwind runs via PostCSS
  (`postcss.config.js` → `@tailwindcss/postcss`); Steam-palette theme tokens live in
  `src/renderer/index.css` (`@theme`); JSX is enabled by `tsconfig` `"jsx": "react-jsx"`.
- Toasts: `sonner` for operation-status feedback. Wrapped in `renderer/lib/toast.ts` as
  `showSuccessToast` / `showErrorToast`; `<Toaster/>` is mounted in `App.tsx`.

## Code conventions

- **Boolean naming:** boolean variables and props are prefixed with `is`, `has`, or `can`
  (e.g. `isLoading`, `hasError`, `canSubmit`).
- **React components** are arrow functions typed with `FC`:
  `const Foo: FC<FooProps> = (props) => { ... }` — bare `FC` (no type args) when the
  component takes no props. Import it as a type: `import { ..., type FC } from 'react'`.
- **Class names:** compose with the `cn()` helper (`src/renderer/lib/cn.ts`; clsx +
  tailwind-merge), not template strings — required when classes are conditional or a
  `className` prop can override defaults.
- **Comments:** keep them compact — the shortest phrasing that preserves the meaning. Cut
  words that just restate the code; keep the intent, caveats, and non-obvious choices.
- **Buttons:** use the `AppButton` component (`renderer/components/AppButton.tsx`) instead
  of a raw `<button>`. It owns the shared base — a lucide icon (`size-4`), `cursor-pointer`
  when enabled / `cursor-not-allowed` when disabled, and an optional `isBusy` spinner —
  while variant styling (colors, padding, border) is passed via `className`.

## Domain safety rules (do not violate)

- Steam must be **fully closed** for every action that touches `.acf`/`.acf.bak` — **Block**,
  **Update**, and the **unfreeze restore** (Steam holds state in memory and overwrites on exit).
- **Freezing always snapshots first:** both **Block** and **Update** write the **genuine original**
  to `.acf.bak` before locking/rewriting, so a frozen (read-only) `.acf` **always** has a backup
  holding the version that matches the files on disk. If the backup write fails, **do not freeze**
  (no backup → no lock/write).
- **Never overwrite the backup while the manifest is frozen** — re-faking across builds must keep
  the existing `.bak` (replacing it with a later fake loses the only correct base for a SteamPipe
  delta on unfreeze and the sole recovery source). A frozen manifest with **no** backup is only
  reachable by external deletion: **abort the update** rather than snapshot a fake as "genuine".
- Write `.acf` and `.acf.bak` **atomically** (temp file + `rename`) so a crash mid-write can't leave
  a truncated manifest.
- **Unfreeze restores** the genuine manifest from `.acf.bak`, then clears read-only and removes the
  backup (so the next freeze re-snapshots a fresh original). Leaving a faked manifest in place
  corrupts the install on Steam's next update — a corrupt/empty `.acf.bak` aborts the restore.
- **Never** trigger Steam's "verify integrity" on a frozen game.

## Known issues

- None currently.
