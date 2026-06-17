import { chmod, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse, stringify } from '@node-steam/vdf';

import type { AcfError, AcfResult, AcfWriteResult } from '../../shared/types';
import { manifestFileName, readManifest } from './acf';
import { fetchPublicBuildInfo } from './steamApi';
import { isSteamRunning } from './steamWatch';

// Windows maps chmod to the read-only attribute: no write bits = read-only, write bits = writable.
const READONLY_MODE = 0o444;
const WRITABLE_MODE = 0o666;

/**
 * Toggles the read-only attribute of `appmanifest_<appId>.acf`. Read-only stops Steam from
 * overwriting a frozen manifest; clearing it is the precondition for editing. Does not touch
 * file contents — so no backup is needed (the backup rule guards content writes).
 */
export async function setManifestReadonly(
  steamappsPath: string,
  appId: string,
  isReadonly: boolean,
): Promise<AcfWriteResult> {
  const file = join(steamappsPath, manifestFileName(appId));

  try {
    await chmod(file, isReadonly ? READONLY_MODE : WRITABLE_MODE);

    return { ok: true, isReadonly };
  } catch (err) {
    return { ok: false, error: mapError(file, err) };
  }
}

function mapError(file: string, err: unknown): AcfError {
  const code = (err as NodeJS.ErrnoException).code;

  if (code === 'ENOENT') {
    return {
      kind: 'not-found',
      message: `No manifest at ${file}. Check the Steam folder and App ID.`,
    };
  }

  if (code === 'EPERM' || code === 'EACCES') {
    return { kind: 'permission', message: `Permission denied for ${file}. Run as Administrator.` };
  }

  return { kind: 'write', message: `Could not update ${file}: ${String(err)}` };
}

/**
 * Rewrites `appmanifest_<appId>.acf` so Steam treats the install as up to date at the
 * current public build (buildid/TargetBuildID, each installed depot's manifest, StateFlags=4,
 * AutoUpdateBehavior=1). Safety: refuses while Steam runs, always writes a `.acf.bak` first
 * (no backup → no write), and marks the file read-only afterwards (a frozen manifest is
 * always locked). Returns the fresh on-disk manifest, or a mapped error.
 */
export async function updateManifest(steamappsPath: string, appId: string): Promise<AcfResult> {
  // Steam holds the .acf in memory and rewrites it on exit — it must be fully closed.
  if (await isSteamRunning()) {
    return {
      ok: false,
      error: { kind: 'steam-running', message: 'Close Steam fully before updating the manifest.' },
    };
  }

  const file = join(steamappsPath, manifestFileName(appId));

  let text: string;

  try {
    text = await readFile(file, 'utf8');
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

  let root: { AppState?: Record<string, unknown> };

  try {
    root = parse(text) as { AppState?: Record<string, unknown> };
  } catch (err) {
    return {
      ok: false,
      error: { kind: 'parse', message: `Could not parse ${file}: ${String(err)}` },
    };
  }

  const appState = root.AppState;

  if (!appState || typeof appState !== 'object') {
    return {
      ok: false,
      error: { kind: 'invalid', message: `${file} has no "AppState" block.` },
    };
  }

  const remote = await fetchPublicBuildInfo(appId);

  if (!remote.ok) return remote;

  applyPublicBuild(appState, remote.info.buildId, remote.info.depotManifests);

  // Back up the original before writing — no backup, no write. A prior freeze can leave an
  // existing .bak read-only (blocking overwrite), so clear that flag first; writeFile keeps
  // the backup writable (copyFile would copy the read-only attribute on Windows).
  const backup = `${file}.bak`;

  try {
    await chmod(backup, WRITABLE_MODE).catch(() => {});
    await writeFile(backup, text, 'utf8');
  } catch (err) {
    return {
      ok: false,
      error: { kind: 'write', message: `Backup failed — not writing. ${String(err)}` },
    };
  }

  // Clear read-only to overwrite. Re-lock in `finally` so the file is never left writable —
  // even if the write throws (e.g. disk full). On write failure, roll back to the original.
  try {
    await chmod(file, WRITABLE_MODE);
    await writeFile(file, stringify(root), 'utf8');
  } catch (err) {
    await writeFile(file, text, 'utf8').catch(() => {});

    return { ok: false, error: mapError(file, err) };
  } finally {
    await chmod(file, READONLY_MODE).catch(() => {});
  }

  // Return the fresh on-disk state so the UI reflects exactly what was written.
  return readManifest(steamappsPath, appId);
}

// Rewrites the AppState fields that make Steam treat the install as current at the public
// build: build ids, each installed depot's manifest, StateFlags, AutoUpdateBehavior.
function applyPublicBuild(
  appState: Record<string, unknown>,
  buildId: string,
  depotManifests: Record<string, string>,
): void {
  appState.buildid = buildId;
  appState.TargetBuildID = buildId;
  appState.StateFlags = '4';
  appState.AutoUpdateBehavior = '1';

  const installed = appState.InstalledDepots;

  if (!installed || typeof installed !== 'object') return;

  for (const [depotId, depot] of Object.entries(installed as Record<string, unknown>)) {
    const gid = depotManifests[depotId];

    if (gid && depot && typeof depot === 'object') {
      (depot as Record<string, unknown>).manifest = gid;
    }
  }
}
