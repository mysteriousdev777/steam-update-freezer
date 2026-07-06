import type { ConfirmationKey, ConfirmationSettings } from '@/shared/types';

import { storage } from '@/renderer/lib/storage';

// Persisted user inputs, one storage key per concern.

// The last selected scanned game. Only its App ID is stored — the library is re-resolved from the
// live scan (so a moved game still works), never persisted.
const APP_ID_KEY = 'freezer.appId';

// A manually-picked manifest the scan doesn't list. Takes priority over the scanned App ID on
// launch. Stored as the library folder + App ID the picker already resolved (so no path parsing
// leaks into the renderer); cleared when a scanned game is picked instead.
const MANUAL_TARGET_KEY = 'freezer.manualTarget';

/** The last selected scanned game's App ID, or '' if none is stored. */
export const getStoredAppId = (): string => storage.read(APP_ID_KEY) ?? '';

/** Persists the scanned App ID for the next launch. */
export const setStoredAppId = (appId: string): void => storage.write(APP_ID_KEY, appId);

/** A manually-picked target: the library folder + App ID resolved from the .acf. */
export type ManualTarget = { steamappsPath: string; appId: string };

/** The persisted manual pick, or null if none/invalid. */
export const getStoredManualTarget = (): ManualTarget | null => {
  const raw = storage.read(MANUAL_TARGET_KEY);

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ManualTarget>;

    if (typeof parsed.steamappsPath !== 'string' || typeof parsed.appId !== 'string') return null;

    if (!parsed.steamappsPath || !parsed.appId) return null;

    return { steamappsPath: parsed.steamappsPath, appId: parsed.appId };
  } catch {
    return null;
  }
};

/** Persists a manual pick so it restores (with priority) next launch. */
export const setStoredManualTarget = (target: ManualTarget): void =>
  storage.write(MANUAL_TARGET_KEY, JSON.stringify(target));

/** Clears the manual pick — called when a scanned game is selected instead. */
export const clearStoredManualTarget = (): void => storage.remove(MANUAL_TARGET_KEY);

// Per-action "ask before this" preferences (Settings -> Confirmations). Source of truth lives
// here (renderer): block/update/unblock are consumed where the prompt is shown, and the quit
// preference is folded into the signal useQuitGuard reports to main — so main needs no copy.
const CONFIRMATIONS_KEY = 'freezer.confirmations';

// All confirmations default on; merged over so a key added in a newer build stays enabled.
const DEFAULT_CONFIRMATIONS: ConfirmationSettings = {
  block: true,
  update: true,
  unblock: true,
  quit: true,
};

/** The persisted confirmation preferences, with any missing/invalid key filled from the defaults. */
export const getStoredConfirmations = (): ConfirmationSettings => {
  const raw = storage.read(CONFIRMATIONS_KEY);

  if (!raw) return { ...DEFAULT_CONFIRMATIONS };

  try {
    const parsed = JSON.parse(raw) as Partial<ConfirmationSettings>;

    return { ...DEFAULT_CONFIRMATIONS, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIRMATIONS };
  }
};

/** Persists a single confirmation toggle, preserving the others. */
export const setStoredConfirmation = (key: ConfirmationKey, isEnabled: boolean): void =>
  storage.write(
    CONFIRMATIONS_KEY,
    JSON.stringify({ ...getStoredConfirmations(), [key]: isEnabled }),
  );

// Analytics opt-out (Settings -> Privacy). Stored as the stringified boolean; defaults on, so only
// an explicit 'false' disables it. Read directly at each track site (useAnalytics) so a fresh toggle
// takes effect immediately, with no React state to thread through.
const TELEMETRY_KEY = 'freezer.telemetryEnabled';

/** Whether anonymous usage analytics are enabled (default true; only explicit opt-out turns it off). */
export const getStoredTelemetryEnabled = (): boolean => storage.read(TELEMETRY_KEY) !== 'false';

/** Persists the analytics opt-out preference. */
export const setStoredTelemetryEnabled = (isEnabled: boolean): void =>
  storage.write(TELEMETRY_KEY, String(isEnabled));

// Update-check preference (Settings -> Updates). Stored as the stringified boolean; defaults on, so
// only an explicit 'false' disables the on-launch GitHub release check (useUpdateCheck).
const UPDATE_CHECK_KEY = 'freezer.updateCheckEnabled';

/** Whether the on-launch update check is enabled (default true; only explicit opt-out turns it off). */
export const getStoredUpdateCheckEnabled = (): boolean =>
  storage.read(UPDATE_CHECK_KEY) !== 'false';

/** Persists the update-check preference. */
export const setStoredUpdateCheckEnabled = (isEnabled: boolean): void =>
  storage.write(UPDATE_CHECK_KEY, String(isEnabled));
