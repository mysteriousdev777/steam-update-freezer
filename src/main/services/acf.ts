import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import type { AcfError, AcfResult, AppManifest, InstalledDepot } from '@/shared/types';

import { parseVdf } from '@/main/services/vdf';

export const manifestFileName = (appId: string) => `appmanifest_${appId}.acf`;

// Inverse of manifestFileName: pulls the App ID out of an `appmanifest_<digits>.acf`
// filename, or null if it doesn't match (used when enumerating a library folder).
export const parseManifestAppId = (fileName: string): string | null =>
  /^appmanifest_(\d+)\.acf$/.exec(fileName)?.[1] ?? null;

// VDF values arrive as strings; coerce defensively and default missing keys to ''.
const str = (value: unknown): string => (value == null ? '' : String(value));

// Shorthand for the failed-read result shape.
const fail = (kind: AcfError['kind'], message: string): AcfResult => ({
  ok: false,
  error: { kind, message },
});

// Non-empty string or undefined — for optional VDF fields.
const nonEmpty = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

// BetaKey out of the MountedConfig sub-block, if present.
const betaKeyOf = (block: unknown): string | undefined =>
  block && typeof block === 'object'
    ? nonEmpty((block as Record<string, unknown>).BetaKey)
    : undefined;

/**
 * The active Steam branch for an AppState, read from MountedConfig.BetaKey — the branch actually
 * mounted on disk, which is what a freeze/update must match. Verified against real manifests: a beta
 * install carries BetaKey here; a default-branch install has none (MountedConfig holds only
 * `language`), so absent ⇒ the default branch, which the steamcmd API names 'public'. We deliberately
 * ignore UserConfig.BetaKey (the user's *selected* branch): it diverges from the mounted branch only
 * while a switch is selected-but-not-yet-downloaded, and there it names a branch whose files aren't on
 * disk yet — applying it would desync the manifest.
 */
export const readBranch = (appState: Record<string, unknown>): string =>
  betaKeyOf(appState.MountedConfig) ?? 'public';

/**
 * Reads and parses `appmanifest_<appId>.acf` under `steamappsPath`, returning its key
 * fields or a mapped error. Pure read — never writes, so it's safe on live Steam files.
 */
export const readManifest = async (steamappsPath: string, appId: string): Promise<AcfResult> => {
  const file = join(steamappsPath, manifestFileName(appId));

  let text: string;
  let isReadonly: boolean;

  try {
    text = await readFile(file, 'utf8');
    // Windows: a read-only file has no owner-write bit (mode & 0o200 === 0).
    isReadonly = ((await stat(file)).mode & 0o200) === 0;
  } catch (err) {
    const isMissing = (err as NodeJS.ErrnoException).code === 'ENOENT';

    return isMissing
      ? fail('not-found', `No manifest at ${file}. Check the Steam folder and App ID.`)
      : fail('read', `Could not read ${file}: ${String(err)}`);
  }

  let appState: unknown;

  try {
    appState = (parseVdf(text) as { AppState?: unknown }).AppState;
  } catch (err) {
    return fail('parse', `Could not parse ${file}: ${String(err)}`);
  }

  if (!appState || typeof appState !== 'object') {
    return fail('invalid', `${file} has no "AppState" block.`);
  }

  return { ok: true, isReadonly, manifest: toManifest(appState as Record<string, unknown>) };
};

// Maps the raw AppState object to our DTO.
const toManifest = (appState: Record<string, unknown>): AppManifest => ({
  appId: str(appState.appid),
  name: str(appState.name),
  buildId: str(appState.buildid),
  branch: readBranch(appState),
  stateFlags: str(appState.StateFlags),
  installedDepots: toDepots(appState.InstalledDepots),
});

// InstalledDepots is a map of depotId -> { manifest, size }; flatten it to a list.
const toDepots = (raw: unknown): InstalledDepot[] => {
  if (!raw || typeof raw !== 'object') return [];

  return Object.entries(raw as Record<string, unknown>).map(([depotId, value]) => ({
    depotId,
    manifest: str((value as Record<string, unknown> | null)?.manifest),
  }));
};
