import { useCallback } from 'react';

/**
 * Renderer seam to the freeze/Block (see AGENTS.md). Returns a stable callback that resolves to the
 * post-freeze read-only state or a mapped error.
 */
export const useFreezeManifest = () =>
  useCallback(
    (steamappsPath: string, appId: string) => window.freezer.freezeManifest(steamappsPath, appId),
    [],
  );
