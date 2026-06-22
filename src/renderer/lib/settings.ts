import { storage } from './storage';

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
