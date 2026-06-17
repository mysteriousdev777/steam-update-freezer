import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// The Steam client's main process image name on Windows.
const STEAM_PROCESS = 'steam.exe';

/**
 * Returns true if the Steam client is running. Used to guard manifest writes — Steam holds
 * the .acf in memory and rewrites it on exit, so it must be closed first. On any failure we
 * assume it's running (fail-safe: don't write).
 */
export async function isSteamRunning(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync('tasklist', [
      '/FI',
      `IMAGENAME eq ${STEAM_PROCESS}`,
      '/NH',
      '/FO',
      'CSV',
    ]);

    // A match prints a CSV row containing the image name; no match prints an INFO line.
    return stdout.toLowerCase().includes(STEAM_PROCESS);
  } catch {
    return true;
  }
}
