// Domain DTOs that cross the IPC bridge. Type-only, like src/shared/api.ts — no runtime
// code, so importing these into main or renderer adds no coupling.

/** One entry from a manifest's `InstalledDepots`. */
export type InstalledDepot = {
  depotId: string;
  manifest: string;
};

/** Key fields read from `appmanifest_<appId>.acf` — for display now, freezing later. */
export type AppManifest = {
  appId: string;
  name: string;
  buildId: string;
  stateFlags: string;
  installedDepots: InstalledDepot[];
};

/** One installed game discovered across all Steam libraries — a picker list entry. */
export type InstalledGame = {
  appId: string;
  name: string;
  /** The library `steamapps` folder this game lives in (a game lives in exactly one). */
  steamappsPath: string;
  buildId: string;
  /** true = the manifest is already read-only (frozen). */
  isReadonly: boolean;
};

/**
 * Result of scanning all libraries: the games found, plus how many manifests were present but
 * couldn't be read/parsed — so the UI can warn that the list may be incomplete.
 */
export type InstalledGamesResult = {
  games: InstalledGame[];
  skipped: number;
};

/** Why an acf or API operation failed, mapped so the renderer can show a clear message. */
export type AcfErrorKind =
  | 'not-found'
  | 'read'
  | 'parse'
  | 'invalid'
  | 'write'
  | 'permission'
  | 'steam-running'
  | 'network'
  | 'http';

/** A mapped acf error: a machine-readable kind plus a ready-to-show English message. */
export type AcfError = { kind: AcfErrorKind; message: string };

/** Outcome of reading a manifest: the parsed fields + read-only state, or a mapped error. */
export type AcfResult =
  | { ok: true; manifest: AppManifest; isReadonly: boolean }
  | { ok: false; error: AcfError };

/** Outcome of a manifest attribute change (read-only toggle): success, or a mapped error. */
export type AcfWriteResult = { ok: true; isReadonly: boolean } | { ok: false; error: AcfError };

/**
 * Outcome of the manifest update (rewrite to the current public build): the fresh on-disk manifest
 * plus whether it was actually rewritten (`isChanged: false` = already at the public build, nothing
 * written), or a mapped error.
 */
export type AcfUpdateResult =
  | { ok: true; isChanged: boolean; manifest: AppManifest; isReadonly: boolean }
  | { ok: false; error: AcfError };

/** Outcome of the manual "browse for a manifest file" picker. */
export type PickAcfFileResult =
  | { ok: true; steamappsPath: string; appId: string }
  | { ok: false; reason: 'cancelled' }
  | { ok: false; reason: 'invalid-name'; fileName: string };

/** Display metadata from package.json (via main), for the About screen. */
export type AppInfo = { version: string; author: string };

/** Options for the native confirmation dialog. */
export type ConfirmOptions = {
  message: string;
  detail?: string;
  variant?: 'default' | 'danger';
  confirmLabel?: string;
  cancelLabel?: string;
};

/** Actions that can be gated by a confirmation prompt — the keys of {@link ConfirmationSettings}. */
export type ConfirmationKey = 'block' | 'update' | 'unblock' | 'quit';

/** Persisted "ask before this action" preferences (Settings -> Confirmations). */
export type ConfirmationSettings = Record<ConfirmationKey, boolean>;
