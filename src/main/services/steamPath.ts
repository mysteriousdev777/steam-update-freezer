import { execFile } from 'node:child_process';
import { normalize } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Where the Steam client records its install path on Windows.
const STEAM_REGISTRY_KEY = 'HKCU\\Software\\Valve\\Steam';
const STEAM_PATH_VALUE = 'SteamPath';

/**
 * Steam install root from the registry (`SteamPath`), normalized, or null if Steam isn't
 * installed / the value can't be read. The base for locating each library's `steamapps`
 * folder and `libraryfolders.vdf` (see steamLibraries).
 */
export const getSteamRootPath = async (): Promise<string | null> => {
  try {
    const { stdout } = await execFileAsync('reg', [
      'query',
      STEAM_REGISTRY_KEY,
      '/v',
      STEAM_PATH_VALUE,
    ]);

    const steamPath = parseRegSz(stdout, STEAM_PATH_VALUE);

    // Registry path uses forward slashes; normalize to native separators.
    return steamPath ? normalize(steamPath) : null;
  } catch {
    // `reg` exits non-zero when the key/value is missing (Steam not installed).
    return null;
  }
};

// Parses a `reg query` line ("  SteamPath  REG_SZ  c:/...steam") → the value after REG_SZ.
const parseRegSz = (stdout: string, valueName: string): string | null => {
  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line.startsWith(valueName)) continue;

    const match = line.match(/REG_SZ\s+(.+)$/);

    if (match) return match[1].trim();
  }

  return null;
};
