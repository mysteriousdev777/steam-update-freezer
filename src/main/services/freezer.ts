import { chmod, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { AcfError, AcfResult, AcfUpdateResult, AcfWriteResult } from '../../shared/types';
import { manifestFileName, readManifest } from './acf';
import { fetchPublicBuildInfo } from './steamApi';
import { isSteamRunning } from './steamWatch';
import { parseVdf, stringifyVdf } from './vdf';

// Windows maps chmod to the read-only attribute: no write bits = read-only, write bits = writable.
const READONLY_MODE = 0o444;
const WRITABLE_MODE = 0o666;

/**
 * Atomic write: stage the bytes in a sibling `.tmp` then `rename` over the target. Rename is
 * atomic on the same volume, so a crash mid-write leaves the original intact rather than a
 * truncated `.acf` — the recovery is then a clean restore from `.acf.bak`, not a corrupt file.
 * Clears any read-only flag on the target first (Windows can't rename over a read-only file, e.g.
 * a `.bak` flagged read-only externally). The staging write and rename share one `try`, so a
 * failure at either step removes the `.tmp` instead of orphaning it.
 *
 * `readonly` locks the *staged* file before the rename, so the swapped-in file is read-only the
 * instant its content lands — atomically with the content. This closes the window where a power
 * loss between the rename and a separate re-lock would leave a writable fake manifest (which Steam
 * could then patch over). Without it the renamed-in file is writable; the caller keeps it writable
 * or re-locks it itself.
 */
async function writeFileAtomic(file: string, data: string, readonly = false): Promise<void> {
  const tmp = `${file}.tmp`;

  try {
    await writeFile(tmp, data, 'utf8');

    // Lock the staged copy first so content + read-only land together in the rename (see above).
    if (readonly) await chmod(tmp, READONLY_MODE);

    // Best-effort: the target may not exist yet (first write, or recreating a missing file).
    await chmod(file, WRITABLE_MODE).catch(() => {});
    await rename(tmp, file);
  } catch (err) {
    // Clear read-only (we may have locked the staged copy) so the stray .tmp can be removed.
    await chmod(tmp, WRITABLE_MODE).catch(() => {});
    await rm(tmp, { force: true }).catch(() => {});

    throw err;
  }
}

/**
 * Freeze (Block): snapshot the genuine manifest to `.acf.bak`, then lock the `.acf` read-only.
 * Block only ever runs on an unfrozen (writable, genuine) manifest, so the snapshot is the true
 * on-disk version. Taking it here makes "frozen ⇒ a backup exists" hold for *both* freeze paths
 * (Block and Update) — which is what lets updateManifest safely tell a genuine freeze apart from a
 * fake one. Backup before lock: if the backup fails, the manifest is NOT locked (no backup → no
 * freeze). Steam must be closed so the snapshot is stable and the lock sticks.
 */
export async function freezeManifest(
  steamappsPath: string,
  appId: string,
): Promise<AcfWriteResult> {
  if (await isSteamRunning()) {
    return {
      ok: false,
      error: { kind: 'steam-running', message: 'Close Steam fully before blocking updates.' },
    };
  }

  const file = join(steamappsPath, manifestFileName(appId));
  const backup = `${file}.bak`;

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

  // Don't snapshot a corrupt manifest as the "genuine" original.
  if (!isParseableManifest(text)) {
    return {
      ok: false,
      error: { kind: 'invalid', message: `${file} is unreadable — cannot freeze.` },
    };
  }

  // Snapshot the genuine original before locking — no backup, no freeze.
  try {
    await writeFileAtomic(backup, text);
  } catch (err) {
    return {
      ok: false,
      error: { kind: 'write', message: `Backup failed — not freezing. ${String(err)}` },
    };
  }

  try {
    await chmod(file, READONLY_MODE);
  } catch (err) {
    return { ok: false, error: mapError(file, err) };
  }

  return { ok: true, isReadonly: true };
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
 * AutoUpdateBehavior=1). Safety: refuses while Steam runs; on a still-genuine (writable) manifest
 * snapshots it to `.acf.bak` first, while on a frozen one preserves the existing `.bak` (and aborts
 * if it's missing or corrupt — see below); writes atomically (temp + rename, the new manifest
 * landing read-only); and re-locks read-only afterwards. Returns the fresh on-disk manifest, or a
 * mapped error.
 */
export async function updateManifest(
  steamappsPath: string,
  appId: string,
): Promise<AcfUpdateResult> {
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

  // A read-only .acf is one we already froze, so its contents are a fake — backing it up would
  // overwrite the genuine original. A writable .acf is still genuine and safe to snapshot.
  let wasFrozen = false;

  try {
    wasFrozen = ((await stat(file)).mode & 0o200) === 0;
  } catch {
    // stat shouldn't fail right after a successful read; treat as not-frozen if it does.
  }

  let root: { AppState?: Record<string, unknown> };

  try {
    root = parseVdf(text) as { AppState?: Record<string, unknown> };
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

  const { buildId, depotManifests } = remote.info;

  // Skip the rewrite (and its backup) when the manifest already claims the current public build —
  // there's nothing to change. Re-read so the result still reflects on-disk state.
  if (isAtPublicBuild(appState, buildId, depotManifests)) {
    return withChanged(await readManifest(steamappsPath, appId), false);
  }

  applyPublicBuild(appState, buildId, depotManifests);

  const backup = `${file}.bak`;

  if (!wasFrozen) {
    // Live manifest is still genuine — snapshot it (create or refresh) before the first rewrite.
    try {
      await writeFileAtomic(backup, text);
    } catch (err) {
      return {
        ok: false,
        error: { kind: 'write', message: `Backup failed — not writing. ${String(err)}` },
      };
    }
  } else {
    // Frozen: the genuine original must already be in .bak. Require it present AND parseable before
    // re-faking — a missing or corrupted backup leaves no recovery source, so refuse rather than
    // pile another fake on top (which would only surface later when unfreeze fails). Both freeze
    // paths write a valid .bak, so this is only reachable after external deletion/corruption.
    let backupText: string | null = null;

    try {
      backupText = await readFile(backup, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        return {
          ok: false,
          error: { kind: 'read', message: `Could not read ${backup}: ${String(err)}` },
        };
      }
    }

    if (backupText === null || !isParseableManifest(backupText)) {
      return {
        ok: false,
        error: {
          kind: 'invalid',
          message: `Backup ${backup} is missing or unreadable for a frozen manifest. Unblock the game (then verify its files in Steam if needed) before updating.`,
        },
      };
    }
    // else: frozen + valid .bak → preserve the genuine original, skip the snapshot.
  }

  // Swap in the new manifest atomically and read-only (temp + rename, the staged copy locked first
  // so the fake never lands writable — even a power loss can't leave a writable fake). The `finally`
  // re-lock is a cheap safety net for the off-chance the staged lock didn't take.
  try {
    await writeFileAtomic(file, stringifyVdf(root), true);
  } catch (err) {
    return { ok: false, error: mapError(file, err) };
  } finally {
    await chmod(file, READONLY_MODE).catch(() => {});
  }

  // Return the fresh on-disk state so the UI reflects exactly what was written.
  return withChanged(await readManifest(steamappsPath, appId), true);
}

/**
 * Unfreeze: restore the genuine manifest from `.acf.bak`, clear read-only, then drop the backup.
 * Restoring the *true* installed version is what lets SteamPipe compute a correct delta on the
 * next update — leaving the faked manifest in place patches new chunks over old files and corrupts
 * the install. Writes content, so Steam must be closed. The backup is removed afterwards so the
 * next freeze re-snapshots a fresh original. With no backup it just unblocks (nothing to restore);
 * a corrupt/empty backup aborts rather than overwriting the live manifest with garbage.
 */
export async function restoreManifest(steamappsPath: string, appId: string): Promise<AcfResult> {
  if (await isSteamRunning()) {
    return {
      ok: false,
      error: { kind: 'steam-running', message: 'Close Steam fully before unblocking the game.' },
    };
  }

  const file = join(steamappsPath, manifestFileName(appId));
  const backup = `${file}.bak`;

  let backupText: string | null = null;

  try {
    backupText = await readFile(backup, 'utf8');
  } catch (err) {
    // No backup is fine — fall through to a plain unblock. Any other read error is fatal.
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      return {
        ok: false,
        error: { kind: 'read', message: `Could not read ${backup}: ${String(err)}` },
      };
    }
  }

  if (backupText !== null) {
    // Never restore a truncated/garbage backup over a possibly-good manifest.
    if (!isParseableManifest(backupText)) {
      return {
        ok: false,
        error: {
          kind: 'invalid',
          message: `Backup ${backup} is empty or unreadable — not restoring. Verify the game in Steam instead.`,
        },
      };
    }

    try {
      // writeFileAtomic clears read-only and recreates the .acf from the backup even if the live
      // file is missing/truncated; the restored manifest stays writable (unfrozen).
      await writeFileAtomic(file, backupText);
    } catch (err) {
      // writeFileAtomic may have cleared read-only before failing at rename — re-lock so a failed
      // unfreeze never leaves a *writable fake* manifest (Steam could then patch over the old
      // files). Failure-only (not `finally`): a successful restore must stay writable. The `.bak`
      // is dropped below only on success, so a retry still has the genuine original.
      await chmod(file, READONLY_MODE).catch(() => {});

      return { ok: false, error: mapError(file, err) };
    }

    // Genuine manifest is live again; drop the backup so the next freeze snapshots afresh.
    await rm(backup, { force: true }).catch(() => {});
  } else {
    // Nothing to restore — just clear the freeze lock.
    try {
      await chmod(file, WRITABLE_MODE);
    } catch (err) {
      return { ok: false, error: mapError(file, err) };
    }
  }

  // Return the fresh on-disk state (genuine + writable) so the UI reflects the unfreeze.
  return readManifest(steamappsPath, appId);
}

// True when text parses as VDF with an AppState block — guards against restoring a corrupt backup.
function isParseableManifest(text: string): boolean {
  if (text.trim().length === 0) return false;

  try {
    const root = parseVdf(text) as { AppState?: unknown };

    return Boolean(root.AppState) && typeof root.AppState === 'object';
  } catch {
    return false;
  }
}

// Tags a manifest read with whether the update actually rewrote the file (false = already current).
function withChanged(read: AcfResult, changed: boolean): AcfUpdateResult {
  return read.ok
    ? { ok: true, changed, manifest: read.manifest, isReadonly: read.isReadonly }
    : read;
}

// True when the manifest already claims the current public build: every field applyPublicBuild
// would set already matches, so the rewrite is a no-op and can be skipped. Mirrors applyPublicBuild.
// Values arrive from the VDF parser as strings (incl. big depot gids, kept lossless — see vdf.ts);
// coerce defensively before comparing so a missing field reads as "not current".
function isAtPublicBuild(
  appState: Record<string, unknown>,
  buildId: string,
  depotManifests: Record<string, string>,
): boolean {
  if (String(appState.buildid) !== buildId) return false;

  if (String(appState.TargetBuildID) !== buildId) return false;

  if (String(appState.StateFlags) !== '4') return false;

  if (String(appState.AutoUpdateBehavior) !== '1') return false;

  const installed = appState.InstalledDepots;

  if (installed && typeof installed === 'object') {
    for (const [depotId, depot] of Object.entries(installed as Record<string, unknown>)) {
      const gid = depotManifests[depotId];

      if (gid && depot && typeof depot === 'object') {
        if (String((depot as Record<string, unknown>).manifest) !== gid) return false;
      }
    }
  }

  return true;
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
