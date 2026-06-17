import { useCallback } from 'react';

/**
 * Renderer seam to the manifest read-only toggle (see AGENTS.md). Returns a stable callback
 * resolving to success or a mapped error.
 */
export const useSetManifestReadonly = () =>
  useCallback(
    (steamappsPath: string, appId: string, isReadonly: boolean) =>
      window.freezer.setManifestReadonly(steamappsPath, appId, isReadonly),
    [],
  );
