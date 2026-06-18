// Shape of the bridge API exposed on `window.freezer`.
// Imported as a *type* by both preload (which implements it) and renderer (which
// consumes it). Type-only imports are erased at build time, so there is no runtime
// coupling between the two bundles. See docs/DECISIONS.md (§1).
import type { AcfResult, AcfWriteResult } from './types';

export type FreezerApi = {
  /** Round-trip smoke test of the preload bridge. */
  ping: () => Promise<string>;

  /** Native folder picker → chosen path, or null if cancelled. `defaultPath` pre-selects. */
  selectFolder: (defaultPath?: string) => Promise<string | null>;

  /** Default `steamapps` path from the Windows registry, or null if unresolved. */
  getDefaultSteamapps: () => Promise<string | null>;

  /** Reads `appmanifest_<appId>.acf` under `steamappsPath` → key fields or a mapped error. */
  readManifest: (steamappsPath: string, appId: string) => Promise<AcfResult>;

  /** Sets/clears the read-only attribute of `appmanifest_<appId>.acf` (no content change). */
  setManifestReadonly: (
    steamappsPath: string,
    appId: string,
    isReadonly: boolean,
  ) => Promise<AcfWriteResult>;

  /** Rewrites the manifest to the current public build → fresh manifest, or a mapped error. */
  updateManifest: (steamappsPath: string, appId: string) => Promise<AcfResult>;

  /** Reports whether updates are currently unblocked, so quitting can be guarded with a confirm. */
  reportUpdateUnblocked: (isUnblocked: boolean) => Promise<void>;

  /** Listens for a request from the main process to show the quit confirmation dialog.
   * Returns an unsubscribe function — call it on cleanup to avoid leaking IPC listeners. */
  onQuitRequest: (callback: () => void) => () => void;

  /** Tells the main process that the user confirmed the quit. */
  confirmQuit: () => Promise<void>;
};
