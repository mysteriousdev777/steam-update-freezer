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
  /** Folder under the library's `steamapps/common/` where the game's files live. */
  installDir: string;
  buildId: string;
  /** Active Steam branch: 'public' for the default branch, else the BetaKey (e.g. 'beta'). */
  branch: string;
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
 * Outcome of the manifest update (rewrite to the active branch's current build): the fresh on-disk
 * manifest plus whether it was actually rewritten (`isChanged: false` = already at the branch's
 * current build, nothing written), or a mapped error.
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
  // Lower-emphasis informational callout shown below `detail` (e.g. a safety caveat).
  note?: string;
  variant?: 'default' | 'danger';
  confirmLabel?: string;
  cancelLabel?: string;
};

/** Actions that can be gated by a confirmation prompt — the keys of {@link ConfirmationSettings}. */
export type ConfirmationKey = 'block' | 'update' | 'unblock' | 'quit';

/** Persisted "ask before this action" preferences (Settings -> Confirmations). */
export type ConfirmationSettings = Record<ConfirmationKey, boolean>;

/** Analytics event names we emit (Aptabase) — centralized so call sites stay typo-safe. */
export type AnalyticsEvent = 'app_opened' | 'manifest_updated';

/** Custom properties attached to an analytics event (Aptabase accepts string/number/boolean). */
export type AnalyticsProps = Record<string, string | number | boolean>;

/** Minimal fields required from a GitHub API release response to check for updates. */
export type GithubRelease = {
  tag_name: string;
  html_url: string;
};

/** Outcome of fetching the latest GitHub release: the release info, or a mapped error. */
export type GithubReleaseResult =
  | { ok: true; release: GithubRelease }
  | { ok: false; error: AcfError };

/** A crypto donation wallet shown in the About tab's DonateBlock. */
export type CryptoWallet = {
  /** Stable identifier (e.g. "evm", "tron") — used as the React key; never displayed. */
  id: string;
  /** Display name shown as the row label (e.g. "EVM", "Bitcoin"). */
  name: string;
  /** Networks/tokens the address accepts, shown as the row caption. */
  network: string;
  /** The full wallet address, copied verbatim to the clipboard. */
  address: string;
};

/**
 * Remote visibility flags for the donation targets (see main/services/donateConfig). The targets
 * themselves are baked into the app; the remote only toggles what shows, so a payment method can be
 * hidden without an app update.
 */
export type DonateFlags = {
  kofi: boolean;
  /** Baked-in wallet ids (DONATE_DATA) to show; a wallet renders only if its id is listed here. */
  wallets: string[];
};

/**
 * Effective config the DonateBlock renders — baked-in targets after the flags are applied:
 * `kofiUrl: null` hides the Ko-fi button, empty `wallets` hides the crypto list, both hide the block.
 */
export type DonateConfig = {
  kofiUrl: string | null;
  wallets: CryptoWallet[];
};
