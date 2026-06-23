// Thin preload bridge: exposes a minimal, typed API on `window.freezer` over IPC.
// No Node logic lives here (the sandbox blocks heavy Node APIs anyway) — every method
// just forwards to a handler in the main process. See AGENTS.md (Architecture).
import { contextBridge, ipcRenderer } from 'electron';
import type { FreezerApi } from '../shared/api';

const api: FreezerApi = {
  ping: () => ipcRenderer.invoke('ping'),
  listInstalledGames: () => ipcRenderer.invoke('listInstalledGames'),
  readManifest: (steamappsPath, appId) => ipcRenderer.invoke('readManifest', steamappsPath, appId),
  pickAcfFile: () => ipcRenderer.invoke('pickAcfFile'),
  freezeManifest: (steamappsPath, appId) =>
    ipcRenderer.invoke('freezeManifest', steamappsPath, appId),
  updateManifest: (steamappsPath, appId) =>
    ipcRenderer.invoke('updateManifest', steamappsPath, appId),
  restoreManifest: (steamappsPath, appId) =>
    ipcRenderer.invoke('restoreManifest', steamappsPath, appId),
  reportUpdateUnblocked: isUnblocked => ipcRenderer.invoke('reportUpdateUnblocked', isUnblocked),
  onQuitRequest: callback => {
    const listener = () => callback();

    ipcRenderer.on('request-quit-confirm', listener);

    return () => ipcRenderer.removeListener('request-quit-confirm', listener);
  },
  confirmQuit: () => ipcRenderer.invoke('confirmQuit'),
  minimizeWindow: () => ipcRenderer.invoke('minimizeWindow'),
  closeWindow: () => ipcRenderer.invoke('closeWindow'),
};

contextBridge.exposeInMainWorld('freezer', api);
