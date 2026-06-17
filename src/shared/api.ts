// Shape of the bridge API exposed on `window.freezer`.
// Imported as a *type* by both preload (which implements it) and renderer (which
// consumes it). Type-only imports are erased at build time, so there is no runtime
// coupling between the two bundles. See docs/DECISIONS.md (§1).
import type { AcfResult, AcfWriteResult, ConfirmOptions } from './types';

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

  /** Native OK/Cancel confirmation dialog. Resolves true if the user confirms. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};
