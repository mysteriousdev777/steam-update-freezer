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
- `pnpm start` — run the app in dev (electron-forge); long-running watch mode. Maintainer-run — see below.
- `pnpm run make` — package/build the app.
- `pnpm run lint` — ESLint (flat config, `eslint.config.mjs`). Maintainer-run — see below.

Gotchas:

- The **renderer** (`src/renderer/`) hot-reloads on its own. Everything else bundled into the
  running app — **main process** (`src/main/`), **preload** (`src/preload/`), and build config
  (`forge.config.ts` / `webpack.*`) — only takes effect after the dev server restarts. So after
  editing any of those, end the reply with a bold blockquote callout so the maintainer can't miss
  it in the chat flow (Antigravity's renderer doesn't style GitHub `[!WARNING]` alerts, so use
  emoji + bold, not that syntax):

  ```
  > 🔄 **ACTION NEEDED** — restart the dev server (`pnpm start`); this change isn't live until then.
  ```
- **No elevation is requested** (dev or prod): Electron runs `asInvoker` (no execution-level
  manifest in `forge.config.ts`) — no UAC prompt. Writes to Steam files normally just work, as
  Steam's install folder is user-writable (it self-updates without admin). On `EPERM`/`EACCES`
  (a locked-down path), `freezer.ts` only surfaces an informational "Run as Administrator" toast;
  the app never self-elevates — admin is the user's fallback, not a precondition.

## Maintainer-owned — don't run these

Write code that's correct, typed, and lint-clean, but leave verification, VCS, and dependency
steps to the maintainer. **Don't run** the commands below — when one is needed, give the exact
command and let the maintainer run it.

| Area          | Don't run                                  | Instead                                                                                       |
| ------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Git           | `git status` / `add` / `commit` / `diff` … | Create/edit files only; leave all VCS to the maintainer — unless a task explicitly asks for git work. |
| Dependencies  | `pnpm add` / `install` / `remove`          | Hand over the exact command to run.                                                           |
| Dev server    | `pnpm start`                               | The maintainer keeps it running and verifies the app (watch mode). Renderer hot-reloads; flag any non-renderer change (main / preload / build config) with a bold 🔄 callout so they restart it. |
| Type checking | `tsc` / `pnpm exec tsc --noEmit`           | Write correctly-typed code; the maintainer checks types in the IDE.                           |
| Linting       | `pnpm run lint` / `eslint`                 | Follow the configured rules; the maintainer lints in the IDE.                                 |
| Tests         | any test runner (vitest / jest / …)        | There are none — don't add one or write test files; the maintainer verifies manually by running the app. |

Why these are set up this way:

- **Transpile-only build (don't re-add a type-checker):** `ts-loader` runs `transpileOnly: true`
  and there is **no** `ForkTsCheckerWebpackPlugin` (`webpack.plugins.ts`), so type errors never
  fail the build or print to the terminal. `strict` is on in `tsconfig.json` for IDE checking.
- **Lint/format:** ESLint 9 flat config (`eslint.config.mjs`); Prettier runs through ESLint via
  `eslint-plugin-prettier`, style in `.prettierrc.json`.

## Architecture

Electron secure defaults are kept (`contextIsolation: true`, `nodeIntegration: false`,
sandbox). Rationale is reliability/testability, not security.

- All privileged work runs in the **main** process behind `ipcMain.handle`.
- **preload is a thin bridge only**: `contextBridge.exposeInMainWorld('freezer', ...)`
  forwarding to `ipcRenderer.invoke`. No Node logic in preload.
- The **renderer** reaches main only through `window.freezer`. No direct
  `fs` / `child_process` / Node usage in the renderer.
- **Process Boundaries (Lint-enforced):** The renderer cannot import `electron` or `main/` (use `window.freezer` instead). `main/services/*` cannot import `electron` (keep them pure Node). Never bypass these seams with direct imports.

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
      closeGuard.ts     #   "guard quit?" flag (renderer-combined) for the quit-confirm guard (main/index.ts close handler)
      freezer.ts        #   freeze (snapshot+lock), manifest rewrite, unfreeze restore (atomic writes, backup, Steam-closed guard)
      steamApi.ts       #   public buildid + depot manifests from api.steamcmd.net
      steamLibraries.ts #   list installed games across all Steam libraries (registry + libraryfolders.vdf)
      steamPath.ts      #   Steam install root from the registry (SteamPath, reg query); base for steamapps
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
- **`@/*` path alias (`@/` → `src/`):** Use the root alias for **all** imports outside the current
  directory (e.g., `@/shared/types` or `@/main/services/vdf`). Declared in `tsconfig.json`
  (`paths`, for the IDE) **and** both webpack configs (`resolve.alias`) — `ts-loader` is
  transpile-only, so tsconfig `paths` alone don't rewrite the emitted JS; webpack must resolve
  the alias too. Only same-directory sibling imports stay relative (`./`); **do not use `../`**.
  The alias does **not** loosen process boundaries — those stay lint-enforced (see Architecture);
  `@/main` from the renderer is an error, not a shortcut.
- **`@assets/*` alias (`@assets/` → repo-root `assets/`):** import bundled assets from outside
  `src/` (e.g. `@assets/icon.png`), not `../../../assets/…`. In `tsconfig.json` + renderer webpack only.

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
- Toasts: `sonner` for operation-status feedback. Wrapped in `renderer/lib/toast.tsx` as
  `showSuccessToast` / `showErrorToast`; `<Toaster/>` is mounted in `App.tsx`.

## Code conventions

- **Boolean naming:** boolean variables and props are prefixed with `is`, `has`, or `can`
  (e.g. `isLoading`, `hasError`, `canSubmit`).
- **Type declarations:** use `type`, never `interface` (enforced by
  `@typescript-eslint/consistent-type-definitions`). The sole exception is ambient declaration
  merging — e.g. augmenting the global `Window` in `src/types/global.d.ts` requires `interface`,
  so the rule is turned off for `**/*.d.ts`.
- **React components** are arrow functions typed with `FC`:
  `const Foo: FC<FooProps> = (props) => { ... }` — bare `FC` (no type args) when the
  component takes no props. Import it as a type: `import { ..., type FC } from 'react'`.
- **Function style:** renderer code (components, hooks, `lib/` helpers) is arrow-only — no
  `function` declarations. In `main/`/`services/`, `function` declarations are fine and preferred
  when a module reads top-down (entry function first, helpers below via hoisting); arrows otherwise.
  Callbacks are always arrows.
- **Class names:** compose with the `cn()` helper (`src/renderer/lib/cn.ts`; clsx +
  tailwind-merge), not template strings — required when classes are conditional or a
  `className` prop can override defaults.
- **Import order:** sorted automatically by `@ianvs/prettier-plugin-sort-imports`. Don't hand-order imports. The exact grouping and blank-line separation rules are defined in `.prettierrc.json`.
- **Comments:** keep them compact — the shortest phrasing that preserves the meaning. Cut
  words that just restate the code; keep the intent, caveats, and non-obvious choices.
- **Buttons:** use the `AppButton` component (`renderer/components/AppButton.tsx`) instead
  of a raw `<button>`. It owns the shared base — a lucide icon (`size-4`), `cursor-pointer`
  when enabled / `cursor-not-allowed` when disabled, and an optional `isBusy` spinner —
  while variant styling (colors, padding, border) is passed via `className`.

## Domain safety rules (do not violate)

- Steam must be **fully closed** for every action that touches `.acf`/`.acf.bak` — **Block**,
  **Update**, and the **unfreeze restore** (Steam holds state in memory and overwrites on exit).
- **Freezing always snapshots the genuine original first.** On the unfrozen → frozen transition the
  current (genuine) `.acf` is written to `.acf.bak` before the `.acf` is locked/rewritten — so a
  frozen (read-only) `.acf` **always** has a backup matching the files on disk. **Block** snapshots
  the unfrozen manifest it locks; **Update** snapshots only when the live `.acf` is still genuine
  (unfrozen), and preserves the existing `.bak` when it's already frozen (next rule). If the backup
  write fails, **do not freeze** (no backup → no lock/write).
- **Never snapshot `.bak` from a frozen `.acf`** — its contents may be a fake, so both writers
  refuse this at the service level, not just via the UI gate: **Update** keeps the existing `.bak`
  when re-faking across builds (a later fake loses the only correct base for a SteamPipe delta on
  unfreeze and the sole recovery source), and **Block** bails idempotently when the `.acf` is already
  read-only. A frozen manifest with **no** backup is only reachable by external deletion: **Update
  aborts** rather than snapshot a fake as "genuine" — unblock first to get a writable genuine
  manifest a fresh freeze can re-snapshot.
- Write `.acf` and `.acf.bak` **atomically** (temp file + `rename`) so a crash mid-write can't leave
  a truncated manifest.
- **Unfreeze restores** the genuine manifest from `.acf.bak`, then clears read-only and removes the
  backup (so the next freeze re-snapshots a fresh original). Leaving a faked manifest in place
  corrupts the install on Steam's next update — a corrupt/empty `.acf.bak` aborts the restore.
- **Never** trigger Steam's "verify integrity" on a frozen game.

## Known issues

- None currently.
