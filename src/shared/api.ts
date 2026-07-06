// Shape of the bridge API exposed on `window.freezer`.
// Imported as a *type* by both preload (which implements it) and renderer (which
// consumes it). Type-only imports are erased at build time, so there is no runtime
// coupling between the two bundles.
import type {
  AcfResult,
  AcfUpdateResult,
  AcfWriteResult,
  AnalyticsEvent,
  AnalyticsProps,
  AppInfo,
  GithubReleaseResult,
  InstalledGamesResult,
  PickAcfFileResult,
} from '@/shared/types';

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

  /** Reports whether a quit should be guarded with a confirmation — updates unblocked and the quit
   * confirmation enabled (the renderer combines both) — so main can intercept the window close. */
  reportQuitGuard: (isEnabled: boolean) => Promise<void>;

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

  /** Display metadata read from package.json (version + author), for the About screen. */
  getAppInfo: () => Promise<AppInfo>;

  /** Fetches the latest release info from GitHub API. This bypasses renderer CSP. */
  getLatestRelease: () => Promise<GithubReleaseResult>;

  /** Resets the main window to its default content size and re-centers it (Settings -> Window). */
  restoreDefaultWindowSize: () => Promise<void>;

  /** Opens an https URL in the OS default browser (About screen links) — never in-app. */
  openExternal: (url: string) => Promise<void>;

  /** Sends an anonymous analytics event to Aptabase via main. No-op in unofficial builds (no key);
   * the renderer also gates on the user's opt-out (Settings -> Privacy) before calling. */
  trackEvent: (eventName: AnalyticsEvent, props?: AnalyticsProps) => Promise<void>;
};
