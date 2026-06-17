import {
  BrowserWindow,
  dialog,
  ipcMain,
  type MessageBoxOptions,
  type OpenDialogOptions,
} from 'electron';
import type { ConfirmOptions } from '../shared/types';
import { getDefaultSteamappsPath } from './services/steamPath';
import { readManifest } from './services/acf';
import { setManifestReadonly } from './services/freezer';

/**
 * Registers every `ipcMain.handle` channel — the main-process side of the preload bridge.
 * Handlers only forward to the modules in ./services; no domain logic lives here.
 * See AGENTS.md (Architecture). Channel names will move to src/shared/channels.ts once
 * there is more than one.
 */
export function registerIpcHandlers(): void {
  // Step 1 smoke test of the renderer <-> preload <-> main round-trip.
  ipcMain.handle('ping', () => `pong from main process @ ${new Date().toISOString()}`);

  // Native folder picker. The dialog is Electron glue, so it lives here, not in a service
  // (services stay pure Node — see AGENTS.md).
  ipcMain.handle('selectFolder', async (event, defaultPath?: string) => {
    const options: OpenDialogOptions = {
      properties: ['openDirectory'],
      defaultPath,
    };

    // Anchor to the calling window so it opens modal to the app.
    const parent = BrowserWindow.fromWebContents(event.sender);
    const result = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled || result.filePaths.length === 0) return null;

    return result.filePaths[0];
  });

  // Default steamapps path from the registry; forwards to the pure-Node steamPath service.
  ipcMain.handle('getDefaultSteamapps', () => getDefaultSteamappsPath());

  // Reads appmanifest_<appId>.acf under the given path; forwards to the acf service.
  ipcMain.handle('readManifest', (_event, steamappsPath: string, appId: string) =>
    readManifest(steamappsPath, appId),
  );

  // Toggles the manifest's read-only attribute; forwards to the freezer service.
  ipcMain.handle(
    'setManifestReadonly',
    (_event, steamappsPath: string, appId: string, isReadonly: boolean) =>
      setManifestReadonly(steamappsPath, appId, isReadonly),
  );

  // Native OK/Cancel confirmation dialog; resolves true when the user clicks OK.
  ipcMain.handle('confirm', async (event, options: ConfirmOptions) => {
    const box: MessageBoxOptions = {
      type: 'warning',
      message: options.message,
      detail: options.detail,
      buttons: ['Cancel', 'OK'],
      defaultId: 1,
      cancelId: 0,
      noLink: true,
    };

    const parent = BrowserWindow.fromWebContents(event.sender);
    const { response } = parent
      ? await dialog.showMessageBox(parent, box)
      : await dialog.showMessageBox(box);

    return response === 1;
  });
}
