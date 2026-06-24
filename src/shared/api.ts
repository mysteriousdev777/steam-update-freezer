// Shape of the bridge API exposed on `window.freezer`.
// Imported as a *type* by both preload (which implements it) and renderer (which
// consumes it). Type-only imports are erased at build time, so there is no runtime
// coupling between the two bundles. See docs/DECISIONS.md (§1).
import type {
  AcfResult,
  AcfUpdateResult,
  AcfWriteResult,
  InstalledGamesResult,
  PickAcfFileResult,
} from './types';

export type FreezerApi = {
  /** Round-trip smoke test of the preload bridge. */
  ping: () => Promise<string>;

  /** Every installed game across all Steam libraries (+ count of unreadable manifests). For the
   * picker; games empty if none/Steam absent. */
  listInstalledGames: () => Promise<InstalledGamesResult>;

  /** Reads `appmanifest_<appId>.acf` under `steamappsPath` → key fields or a mapped error. */
  readManifest: (steamappsPath: string, appId: string) => Promise<AcfResult>;

  /** Opens a native file picker for a manifest the scan didn't find (e.g. an exotic install
   * path) → its library folder + App ID, or why it couldn't be used. */
  pickAcfFile: () => Promise<PickAcfFileResult>;

  /** Freeze (Block): snapshots the genuine manifest to `.acf.bak`, then locks it read-only → the
   * on-disk read-only state, or a mapped error. Writes a backup, so Steam must be closed. */
  freezeManifest: (steamappsPath: string, appId: string) => Promise<AcfWriteResult>;

  /** Rewrites the manifest to the current public build (skipped if already current) → fresh
   * manifest + whether it changed, or a mapped error. */
  updateManifest: (steamappsPath: string, appId: string) => Promise<AcfUpdateResult>;

  /** Unfreeze: restores the genuine manifest from `.acf.bak`, clears read-only, and drops the
   * backup → fresh manifest, or a mapped error. Writes content, so Steam must be closed. */
  restoreManifest: (steamappsPath: string, appId: string) => Promise<AcfResult>;

  /** Reports whether updates are currently unblocked, so quitting can be guarded with a confirm. */
  reportUpdateUnblocked: (isUnblocked: boolean) => Promise<void>;

  /** Forwards a renderer-side error (an ErrorBoundary render crash, or a global/unhandled
   * rejection) to the main process, which appends it to the same on-disk log. */
  reportRendererError: (message: string, stack?: string) => Promise<void>;

  /** Listens for a request from the main process to show the quit confirmation dialog.
   * Returns an unsubscribe function — call it on cleanup to avoid leaking IPC listeners. */
  onQuitRequest: (callback: () => void) => () => void;

  /** Tells the main process that the user confirmed the quit. */
  confirmQuit: () => Promise<void>;

  /** Minimizes the main window to the taskbar. */
  minimizeWindow: () => Promise<void>;

  /** Attempts to close the main window (triggers the quit confirmation guard). */
  closeWindow: () => Promise<void>;
};
