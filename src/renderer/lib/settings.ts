import { storage } from './storage';

// Persisted user inputs, keyed via the storage wrapper.
const APP_ID_KEY = 'freezer.appId';
const STEAM_PATH_KEY = 'freezer.steamPath';

/** The last App ID the user entered, or '' if none is stored. */
export const getStoredAppId = (): string => storage.read(APP_ID_KEY) ?? '';

/** Persists the App ID for the next launch. */
export const setStoredAppId = (appId: string): void => storage.write(APP_ID_KEY, appId);

/** The last Steam library folder the user picked, or '' if none is stored. */
export const getStoredSteamPath = (): string => storage.read(STEAM_PATH_KEY) ?? '';

/** Persists the Steam library folder for the next launch. */
export const setStoredSteamPath = (steamPath: string): void =>
  storage.write(STEAM_PATH_KEY, steamPath);
