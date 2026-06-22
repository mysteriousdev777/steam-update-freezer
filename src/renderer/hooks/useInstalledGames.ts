import { useCallback, useEffect, useState } from 'react';

import type { InstalledGame } from '../../shared/types';

/**
 * Owns the installed-games list for the picker: loads on mount, re-loads on `rescan`, and lets a
 * write action flip one game's frozen flag in place (`markGameReadonly`) so its lock icon updates
 * without a full re-scan. `skipped` is how many manifests couldn't be read (partial list); `error`
 * is set when the bridge call itself fails.
 */
export const useInstalledGames = () => {
  const [games, setGames] = useState<InstalledGame[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Bumped by rescan() to re-run the load effect.
  const [scanToken, setScanToken] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    setIsLoading(true);

    window.freezer
      .listInstalledGames()
      .then(result => {
        if (isCancelled) return;

        setGames(result.games);
        setSkipped(result.skipped);
        setError(null);
      })
      .catch(err => {
        if (isCancelled) return;

        setSkipped(0);
        setError(`Could not list installed games: ${String(err)}`);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [scanToken]);

  const rescan = useCallback(() => setScanToken(prev => prev + 1), []);

  // Reflect a freeze/unfreeze on the matching row without re-reading every manifest.
  const markGameReadonly = useCallback((appId: string, isReadonly: boolean) => {
    setGames(prev => prev.map(game => (game.appId === appId ? { ...game, isReadonly } : game)));
  }, []);

  return { games, skipped, isLoading, error, rescan, markGameReadonly };
};
