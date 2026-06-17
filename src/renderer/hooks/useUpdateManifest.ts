import { useCallback } from 'react';

/**
 * Renderer seam to the manifest rewrite (see AGENTS.md). Returns a stable callback that
 * resolves to the post-write manifest state or a mapped error.
 */
export const useUpdateManifest = () =>
  useCallback(
    (steamappsPath: string, appId: string) => window.freezer.updateManifest(steamappsPath, appId),
    [],
  );
