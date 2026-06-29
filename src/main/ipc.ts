import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';

import { dirname } from 'node:path';

import type { AppInfo, PickAcfFileResult } from '@/shared/types';

import { parseManifestAppId, readManifest } from '@/main/services/acf';
import { setQuitGuardEnabled } from '@/main/services/closeGuard';
import { freezeManifest, restoreManifest, updateManifest } from '@/main/services/freezer';
import { listInstalledGames } from '@/main/services/steamLibraries';

import packageJson from '../../package.json';
import { logToFile } from './logger';
import { DEFAULT_WINDOW_HEIGHT, DEFAULT_WINDOW_WIDTH } from './windowState';

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

  // Whether a quit should be guarded by a confirmation (see main/index.ts close handler). The
  // renderer combines "updates unblocked" with the user's quit confirmation preference.
  ipcMain.handle('reportQuitGuard', (_event, isEnabled: boolean) => {
    setQuitGuardEnabled(isEnabled);
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

  // About screen display metadata. Version comes from Electron (reads the packaged
  // app's package.json); author isn't exposed by Electron's API, so read it directly.
  ipcMain.handle(
    'getAppInfo',
    (): AppInfo => ({
      version: app.getVersion(),
      author: packageJson.author,
    }),
  );

  // Settings -> Window -> Restore default window: un-maximize, reset to the default content size,
  // and re-center — a recovery reset of both size and position (e.g. window stuck off-screen).
  ipcMain.handle('restoreDefaultWindowSize', event => {
    const window = BrowserWindow.fromWebContents(event.sender);

    if (!window) return;

    if (window.isMaximized()) window.unmaximize();

    window.setContentSize(DEFAULT_WINDOW_WIDTH, DEFAULT_WINDOW_HEIGHT);
    window.center();
  });

  // About screen external links. Restricted to https so the renderer can't be made to open an
  // arbitrary protocol or a local file path through this channel.
  ipcMain.handle('openExternal', (_event, url: string) => {
    if (!/^https:\/\//.test(url)) return;

    return shell.openExternal(url);
  });
}
