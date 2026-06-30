import { readdir, readFile, stat } from 'node:fs/promises';
import { join, normalize } from 'node:path';

import type { InstalledGame, InstalledGamesResult } from '@/shared/types';

import { parseManifestAppId, readManifest } from '@/main/services/acf';
import { getSteamRootPath } from '@/main/services/steamPath';
import { parseVdf } from '@/main/services/vdf';

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
 * A game found in two libraries (a stale manifest left behind by a move) resolves to the live copy.
 */
export const listInstalledGames = async (): Promise<InstalledGamesResult> => {
  const libraries = await listSteamLibraries();

  const perLibrary = await Promise.all(libraries.map(readGamesIn));

  const skipped = perLibrary.reduce((total, lib) => total + lib.skipped, 0);

  // Group the scanned manifests by appId. A game normally lives in exactly one library, so each
  // group holds one entry. A duplicate means a stale `appmanifest_<appId>.acf` lingers in another
  // library (e.g. an interrupted "move install") — pickLiveGame resolves it to the copy whose files
  // are actually on disk, so we never act on the dead manifest. listSteamLibraries yields the
  // default library first, so each group keeps that order for the tie-break fallback.
  const byAppId = new Map<string, ScannedGame[]>();

  for (const scanned of perLibrary.flatMap(lib => lib.games)) {
    const group = byAppId.get(scanned.game.appId);

    if (group) {
      group.push(scanned);
    } else {
      byAppId.set(scanned.game.appId, [scanned]);
    }
  }

  const resolved = await Promise.all(
    [...byAppId.values()].map(group => (group.length === 1 ? group[0] : pickLiveGame(group))),
  );

  const games = resolved
    .map(scanned => scanned.game)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  return { games, skipped };
};

// A scanned manifest plus the install dir needed to resolve a cross-library appId collision to the
// copy whose files exist. installDir stays internal to the dedupe — it never reaches the DTO.
type ScannedGame = { game: InstalledGame; installDir: string };

type ScanResult = { games: ScannedGame[]; skipped: number };

// Reads every manifest in one library folder into ScannedGame entries, plus a count of manifests
// that were present but unreadable/corrupt (surfaced as `skipped` so the caller can warn).
const readGamesIn = async (steamappsPath: string): Promise<ScanResult> => {
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

      const game: InstalledGame = {
        appId,
        name: result.manifest.name || appId,
        steamappsPath,
        buildId: result.manifest.buildId,
        isReadonly: result.isReadonly,
      };

      return { game, installDir: result.manifest.installDir } satisfies ScannedGame;
    }),
  );

  const games = results.filter((scanned): scanned is ScannedGame => scanned !== null);

  return { games, skipped: results.length - games.length };
};

// Resolves a cross-library appId collision to the live copy: the one whose installed files exist at
// `steamapps/common/<installDir>`. The stale manifest (files already moved to the other library)
// fails this check and drops out. If none or several resolve (a corrupt installDir, or files
// genuinely present in both), keep the first — the default library, which is listed first.
const pickLiveGame = async (candidates: ScannedGame[]): Promise<ScannedGame> => {
  const checked = await Promise.all(
    candidates.map(async scanned => ((await hasInstalledFiles(scanned)) ? scanned : null)),
  );

  return checked.find((scanned): scanned is ScannedGame => scanned !== null) ?? candidates[0];
};

// True when the game's files are present in its own library (steamapps/common/<installDir>).
const hasInstalledFiles = async ({ game, installDir }: ScannedGame): Promise<boolean> => {
  if (installDir.length === 0) return false;

  return isDirectory(join(game.steamappsPath, 'common', installDir));
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
