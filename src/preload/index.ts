// Thin preload bridge: exposes a minimal, typed API on `window.freezer` over IPC.
// No Node logic lives here (the sandbox blocks heavy Node APIs anyway) — every method
// just forwards to a handler in the main process. See AGENTS.md (Architecture).
import { contextBridge, ipcRenderer } from 'electron';
import type { FreezerApi } from '../shared/api';

const api: FreezerApi = {
  ping: () => ipcRenderer.invoke('ping'),
};

contextBridge.exposeInMainWorld('freezer', api);
