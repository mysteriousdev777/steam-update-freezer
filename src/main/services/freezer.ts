import { chmod } from 'node:fs/promises';
import { join } from 'node:path';

import type { AcfError, AcfWriteResult } from '../../shared/types';
import { manifestFileName } from './acf';

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
