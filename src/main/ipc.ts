import { dirname } from 'node:path';
import { BrowserWindow, dialog, ipcMain } from 'electron';
import { listInstalledGames } from './services/steamLibraries';
import { parseManifestAppId, readManifest } from './services/acf';
import { freezeManifest, restoreManifest, updateManifest } from './services/freezer';
import { setUpdateUnblocked } from './services/closeGuard';
import { logToFile } from './logger';
import type { PickAcfFileResult } from '../shared/types';

/**
 * Registers every `ipcMain.handle` channel — the main-process side of the preload bridge.
 * Handlers only forward to the modules in ./services; no domain logic lives here.
 * See AGENTS.md (Architecture). Channel names will move to src/shared/channels.ts once
 * there is more than one.
 */
export function registerIpcHandlers(): void {
  // Step 1 smoke test of the renderer <-> preload <-> main round-trip.
  ipcMain.handle('ping', () => `pong from main process @ ${new Date().toISOString()}`);

  // Enumerates installed games across all Steam libraries; forwards to the steamLibraries service.
  ipcMain.handle('listInstalledGames', () => listInstalledGames());

  // Reads appmanifest_<appId>.acf under the given path; forwards to the acf service.
  ipcMain.handle('readManifest', (_event, steamappsPath: string, appId: string) =>
    readManifest(steamappsPath, appId),
  );

  // Manual target for install paths the scan doesn't find: lets the user point at the .acf
  // directly. The dialog itself is Electron-only, so it lives here rather than in services/.
  ipcMain.handle('pickAcfFile', async (event): Promise<PickAcfFileResult> => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const options = {
      properties: ['openFile' as const],
      filters: [{ name: 'Steam App Manifest', extensions: ['acf'] }],
    };
    const { canceled, filePaths } = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options);

    if (canceled || filePaths.length === 0) return { ok: false, reason: 'cancelled' };

    const filePath = filePaths[0];
    const fileName = filePath.split(/[\\/]/).pop() ?? filePath;
    const appId = parseManifestAppId(fileName);

    if (!appId) return { ok: false, reason: 'invalid-name', fileName };

    return { ok: true, steamappsPath: dirname(filePath), appId };
  });

  // Freeze (Block): snapshot genuine to .acf.bak then lock read-only (Steam-closed guard in freezer).
  ipcMain.handle('freezeManifest', (_event, steamappsPath: string, appId: string) =>
    freezeManifest(steamappsPath, appId),
  );

  // Rewrites the manifest to the current public build (backup + Steam-closed guard in freezer).
  ipcMain.handle('updateManifest', (_event, steamappsPath: string, appId: string) =>
    updateManifest(steamappsPath, appId),
  );

  // Unfreeze: restores the genuine manifest from .acf.bak and unlocks (Steam-closed guard in freezer).
  ipcMain.handle('restoreManifest', (_event, steamappsPath: string, appId: string) =>
    restoreManifest(steamappsPath, appId),
  );

  // Tracks unblocked state for the quit confirmation guard (see main/index.ts close handler).
  ipcMain.handle('reportUpdateUnblocked', (_event, isUnblocked: boolean) => {
    setUpdateUnblocked(isUnblocked);
  });

  // Appends a renderer-side error (ErrorBoundary catch or a global handler) to the same on-disk
  // log the main process uses for its own failures.
  ipcMain.handle('reportRendererError', (_event, message: string, stack?: string) => {
    logToFile('renderer', stack ? `${message}\n${stack}` : message);
  });

  // Window controls for the custom frameless title bar.
  ipcMain.handle('minimizeWindow', event => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.handle('closeWindow', event => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
}
