import { useCallback } from 'react';

/**
 * Renderer seam to the native folder picker — components never touch `window.freezer`
 * directly (see AGENTS.md). Returns a stable callback resolving to the chosen path, or
 * null if cancelled; `defaultPath` pre-selects a starting folder.
 */
export const useFolderPicker = () =>
  useCallback((defaultPath?: string) => window.freezer.selectFolder(defaultPath), []);
