import { ipcMain } from 'electron';

/**
 * Registers every `ipcMain.handle` channel — the main-process side of the preload bridge.
 * Handlers only forward to the modules in ./services; no domain logic lives here.
 * See AGENTS.md (Architecture). Channel names will move to src/shared/channels.ts once
 * there is more than one.
 */
export function registerIpcHandlers(): void {
  // Step 1 smoke test of the renderer <-> preload <-> main round-trip.
  ipcMain.handle('ping', () => `pong from main process @ ${new Date().toISOString()}`);
}
