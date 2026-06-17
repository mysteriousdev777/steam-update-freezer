import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from '@node-steam/vdf';

import type { AcfResult, AppManifest, InstalledDepot } from '../../shared/types';

export const manifestFileName = (appId: string) => `appmanifest_${appId}.acf`;

// VDF values arrive as strings; coerce defensively and default missing keys to ''.
const str = (value: unknown): string => (value == null ? '' : String(value));

/**
 * Reads and parses `appmanifest_<appId>.acf` under `steamappsPath`, returning its key
 * fields or a mapped error. Pure read — never writes, so it's safe on live Steam files.
 */
export async function readManifest(steamappsPath: string, appId: string): Promise<AcfResult> {
  const file = join(steamappsPath, manifestFileName(appId));

  let text: string;
  let isReadonly: boolean;

  try {
    text = await readFile(file, 'utf8');
    // Windows: a read-only file has no owner-write bit (mode & 0o200 === 0).
    isReadonly = ((await stat(file)).mode & 0o200) === 0;
  } catch (err) {
    const isMissing = (err as NodeJS.ErrnoException).code === 'ENOENT';

    return {
      ok: false,
      error: {
        kind: isMissing ? 'not-found' : 'read',
        message: isMissing
          ? `No manifest at ${file}. Check the Steam folder and App ID.`
          : `Could not read ${file}: ${String(err)}`,
      },
    };
  }

  let appState: unknown;

  try {
    appState = (parse(text) as { AppState?: unknown }).AppState;
  } catch (err) {
    return {
      ok: false,
      error: { kind: 'parse', message: `Could not parse ${file}: ${String(err)}` },
    };
  }

  if (!appState || typeof appState !== 'object') {
    return {
      ok: false,
      error: { kind: 'invalid', message: `${file} has no "AppState" block.` },
    };
  }

  return { ok: true, isReadonly, manifest: toManifest(appState as Record<string, unknown>) };
}

// Maps the raw AppState object to our DTO.
function toManifest(appState: Record<string, unknown>): AppManifest {
  return {
    appId: str(appState.appid),
    name: str(appState.name),
    buildId: str(appState.buildid),
    stateFlags: str(appState.StateFlags),
    installedDepots: toDepots(appState.InstalledDepots),
  };
}

// InstalledDepots is a map of depotId -> { manifest, size }; flatten it to a list.
function toDepots(raw: unknown): InstalledDepot[] {
  if (!raw || typeof raw !== 'object') return [];

  return Object.entries(raw as Record<string, unknown>).map(([depotId, value]) => ({
    depotId,
    manifest: str((value as Record<string, unknown> | null)?.manifest),
  }));
}
