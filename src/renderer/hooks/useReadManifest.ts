import { useCallback } from 'react';

/**
 * Renderer seam to the manifest reader (see AGENTS.md). Returns a stable callback that
 * resolves to the parsed manifest or a mapped error.
 */
export const useReadManifest = () =>
  useCallback(
    (steamappsPath: string, appId: string) => window.freezer.readManifest(steamappsPath, appId),
    [],
  );
