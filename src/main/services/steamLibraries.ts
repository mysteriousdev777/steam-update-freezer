import { readdir, readFile, stat } from 'node:fs/promises';
import { join, normalize } from 'node:path';

import type { InstalledGame, InstalledGamesResult } from '../../shared/types';
import { parseVdf } from './vdf';
import { parseManifestAppId, readManifest } from './acf';
import { getSteamRootPath } from './steamPath';

// libraryfolders.vdf lives alongside the main library's manifests.
const getLibraryFoldersFile = (steamRootPath: string) =>
  join(steamRootPath, 'steamapps', 'libraryfolders.vdf');

/**
 * All Steam library `steamapps` folders on this machine: the default one (registry) plus every
 * entry in `libraryfolders.vdf`. Deduped, and filtered to folders that currently exist (a library
 * on a disconnected/removed drive is silently skipped). Empty if Steam isn't installed.
 */
export const listSteamLibraries = async (): Promise<string[]> => {
  const steamRootPath = await getSteamRootPath();

  if (!steamRootPath) return [];

  // Always include the default library; merge in the ones recorded in libraryfolders.vdf.
  const candidates = [
    join(steamRootPath, 'steamapps'),
    ...(await readLibraryFolderPaths(steamRootPath)),
  ];

  // Dedupe case-insensitively (Windows paths) while keeping the original casing.
  const unique = new Map<string, string>();

  for (const path of candidates) {
    const normalized = normalize(path);

    unique.set(normalized.toLowerCase(), normalized);
  }

  // Keep only folders that exist right now (skip disconnected drives).
  const checked = await Promise.all(
    [...unique.values()].map(async path => ((await isDirectory(path)) ? path : null)),
  );

  return checked.filter((path): path is string => path !== null);
};

/**
 * Every installed game discovered across all libraries — one entry per `appmanifest_<appId>.acf`.
 * Reuses readManifest for the per-game fields. Sorted by name (case-insensitive). `skipped` counts
 * manifests that were present but couldn't be read/parsed, so the UI can warn the list is partial.
 */
export const listInstalledGames = async (): Promise<InstalledGamesResult> => {
  const libraries = await listSteamLibraries();

  const perLibrary = await Promise.all(libraries.map(readGamesIn));

  const skipped = perLibrary.reduce((total, lib) => total + lib.skipped, 0);

  // A game normally lives in one library; dedupe by appId in case a stale manifest lingers in
  // another (keeps the first found — listSteamLibraries yields the default library first).
  const byAppId = new Map<string, InstalledGame>();

  for (const game of perLibrary.flatMap(lib => lib.games)) {
    if (!byAppId.has(game.appId)) byAppId.set(game.appId, game);
  }

  const games = [...byAppId.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );

  return { games, skipped };
};

// Reads every manifest in one library folder into InstalledGame entries, plus a count of manifests
// that were present but unreadable/corrupt (surfaced as `skipped` so the caller can warn).
const readGamesIn = async (steamappsPath: string): Promise<InstalledGamesResult> => {
  let entries: string[];

  try {
    entries = await readdir(steamappsPath);
  } catch {
    return { games: [], skipped: 0 };
  }

  const appIds = entries.map(parseManifestAppId).filter((appId): appId is string => appId !== null);

  const results = await Promise.all(
    appIds.map(async appId => {
      const result = await readManifest(steamappsPath, appId);

      if (!result.ok) return null;

      return {
        appId,
        name: result.manifest.name || appId,
        steamappsPath,
        buildId: result.manifest.buildId,
        isReadonly: result.isReadonly,
      } satisfies InstalledGame;
    }),
  );

  const games = results.filter((game): game is InstalledGame => game !== null);

  return { games, skipped: results.length - games.length };
};

// Parses libraryfolders.vdf → each library's `<path>/steamapps`. Tolerates a missing/corrupt file.
const readLibraryFolderPaths = async (steamRootPath: string): Promise<string[]> => {
  let text: string;

  try {
    text = await readFile(getLibraryFoldersFile(steamRootPath), 'utf8');
  } catch {
    return [];
  }

  let folders: unknown;

  try {
    folders = (parseVdf(text) as { libraryfolders?: unknown }).libraryfolders;
  } catch {
    return [];
  }

  if (!folders || typeof folders !== 'object') return [];

  // Each entry is a { path, apps, ... } object in the current format.
  return Object.values(folders as Record<string, unknown>)
    .map(entry => {
      const path = (entry as { path?: unknown } | null)?.path;

      return typeof path === 'string' ? join(path, 'steamapps') : null;
    })
    .filter((path): path is string => path !== null);
};

const isDirectory = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
};
