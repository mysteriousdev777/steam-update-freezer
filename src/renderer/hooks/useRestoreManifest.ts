import { useCallback } from 'react';

/**
 * Renderer seam to the unfreeze/restore (see AGENTS.md). Returns a stable callback that resolves
 * to the restored on-disk manifest state or a mapped error.
 */
export const useRestoreManifest = () =>
  useCallback(
    (steamappsPath: string, appId: string) => window.freezer.restoreManifest(steamappsPath, appId),
    [],
  );
