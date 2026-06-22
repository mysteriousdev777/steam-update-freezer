import { useCallback, useEffect, useState } from 'react';

import type { InstalledGame } from '../../shared/types';
import {
  clearStoredManualTarget,
  getStoredAppId,
  getStoredManualTarget,
  setStoredAppId,
  setStoredManualTarget,
} from '../lib/settings';
import type { ReadTarget } from './useManifest';

/**
 * Owns the read target: the selected game's library folder + App ID. Picking a game resolves both
 * at once and commits the target (triggers a read). Two things are persisted independently: the
 * scanned game's App ID (its library is re-resolved from the live scan, so a moved game still
 * works) and — with priority — a manually-picked manifest's folder + App ID (the scan never lists
 * it). Picking a scanned game clears the manual pick. Still exposes `steamPath`/`appId` so the
 * manifest read/action hooks stay unchanged.
 */
export const useSteamTarget = (games: InstalledGame[]) => {
  const [restoredManual] = useState(getStoredManualTarget);
  const [steamPath, setSteamPath] = useState(restoredManual?.steamappsPath ?? '');
  const [appId, setAppId] = useState(() => restoredManual?.appId ?? getStoredAppId());
  const [target, setTarget] = useState<ReadTarget | null>(null);

  const commit = useCallback((path: string, id: string) => {
    if (path && id) setTarget({ path, id });
  }, []);

  // Set the in-memory target and trigger a read; persistence is left to the caller.
  const applyTarget = useCallback(
    (path: string, id: string) => {
      setSteamPath(path);
      setAppId(id);
      commit(path, id);
    },
    [commit],
  );

  // Pick a scanned game: persist its App ID and drop any manual override.
  const selectGame = useCallback(
    (game: InstalledGame) => {
      applyTarget(game.steamappsPath, game.appId);
      setStoredAppId(game.appId);
      clearStoredManualTarget();
    },
    [applyTarget],
  );

  // Pick a manifest the scan didn't list (e.g. an exotic install path): persist it as the manual
  // override, which takes priority on the next launch.
  const selectManual = useCallback(
    (path: string, id: string) => {
      applyTarget(path, id);
      setStoredManualTarget({ steamappsPath: path, appId: id });
    },
    [applyTarget],
  );

  // Restore the last pick on launch. A manual override wins and loads directly; otherwise the
  // scanned game re-resolves its current library as soon as the scan lists it.
  useEffect(() => {
    if (target || !appId) return;

    if (restoredManual) {
      commit(restoredManual.steamappsPath, restoredManual.appId);
      return;
    }

    const game = games.find(game => game.appId === appId);

    if (game) selectGame(game);
  }, [games, appId, target, restoredManual, selectGame, commit]);

  // Re-read the current target (the panel's Refresh / read-error Retry).
  const readCurrent = useCallback(() => {
    commit(steamPath, appId);
  }, [steamPath, appId, commit]);

  return { steamPath, appId, target, selectGame, selectManual, readCurrent };
};
