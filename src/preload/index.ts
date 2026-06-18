// Thin preload bridge: exposes a minimal, typed API on `window.freezer` over IPC.
// No Node logic lives here (the sandbox blocks heavy Node APIs anyway) — every method
// just forwards to a handler in the main process. See AGENTS.md (Architecture).
import { contextBridge, ipcRenderer } from 'electron';
import type { FreezerApi } from '../shared/api';

const api: FreezerApi = {
  ping: () => ipcRenderer.invoke('ping'),
  selectFolder: defaultPath => ipcRenderer.invoke('selectFolder', defaultPath),
  getDefaultSteamapps: () => ipcRenderer.invoke('getDefaultSteamapps'),
  readManifest: (steamappsPath, appId) => ipcRenderer.invoke('readManifest', steamappsPath, appId),
  setManifestReadonly: (steamappsPath, appId, isReadonly) =>
    ipcRenderer.invoke('setManifestReadonly', steamappsPath, appId, isReadonly),
  updateManifest: (steamappsPath, appId) =>
    ipcRenderer.invoke('updateManifest', steamappsPath, appId),
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
