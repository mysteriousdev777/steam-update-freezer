import { useCallback } from 'react';

/**
 * Renderer seam to the registry-derived default `steamapps` path (see AGENTS.md). Returns
 * a stable callback resolving to that path, or null if it can't be resolved.
 */
export const useDefaultSteamapps = () =>
  useCallback(() => window.freezer.getDefaultSteamapps(), []);
