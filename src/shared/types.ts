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

/** Options for the native confirmation dialog. */
export type ConfirmOptions = {
  message: string;
  detail?: string;
  variant?: 'default' | 'danger';
  confirmLabel?: string;
  cancelLabel?: string;
};
