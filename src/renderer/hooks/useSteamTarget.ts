import { useCallback, useEffect, useState } from 'react';

import { showErrorToast } from '../lib/toast';
import {
  getStoredAppId,
  setStoredAppId,
  getStoredSteamPath,
  setStoredSteamPath,
} from '../lib/settings';
import { useDefaultSteamapps } from './useDefaultSteamapps';
import type { ReadTarget } from './useManifest';

/**
 * Owns the read target: Steam folder + App ID, their persistence, and the registry default.
 * The folder commits the target (triggers a read) on pick/reset; the App ID only on confirm
 * (the field's Done button) — typing it just updates the draft, no read per keystroke.
 * `target` seeds from storage so a restored pair reads on mount.
 */
export const useSteamTarget = () => {
  const getDefaultSteamapps = useDefaultSteamapps();

  const [steamPath, setSteamPath] = useState(getStoredSteamPath);
  const [appId, setAppId] = useState(getStoredAppId);
  const [target, setTarget] = useState<ReadTarget | null>(() =>
    steamPath && appId ? { path: steamPath, id: appId } : null,
  );
  const [isResettingSteamPath, setIsResettingSteamPath] = useState(false);

  const commit = useCallback((path: string, id: string) => {
    if (path && id) setTarget({ path, id });
  }, []);

  // Persist inputs so they're pre-filled on the next launch.
  useEffect(() => {
    setStoredAppId(appId);
  }, [appId]);

  useEffect(() => {
    setStoredSteamPath(steamPath);
  }, [steamPath]);

  // Pre-fill the registry default only while empty (never clobber a pick/restore). Commit if an
  // App ID is known so it reads once the path resolves.
  useEffect(() => {
    if (steamPath) return;

    let isCancelled = false;

    getDefaultSteamapps()
      .then(defaultPath => {
        if (isCancelled || !defaultPath) return;

        setSteamPath(defaultPath);
        commit(defaultPath, appId);
      })
      .catch(err => {
        console.error('[bridge] getDefaultSteamapps failed', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [getDefaultSteamapps, steamPath, appId, commit]);

  const changeSteamPath = useCallback(
    (newPath: string) => {
      setSteamPath(newPath);
      commit(newPath, appId);
    },
    [appId, commit],
  );

  // Re-read the current fields (App ID confirm + the panel's Refresh).
  const readCurrent = useCallback(() => {
    commit(steamPath, appId);
  }, [steamPath, appId, commit]);

  const resetSteamPath = useCallback(async () => {
    setIsResettingSteamPath(true);
    try {
      const defaultPath = await getDefaultSteamapps();

      if (defaultPath) {
        setSteamPath(defaultPath);
        commit(defaultPath, appId);
      } else {
        showErrorToast('Could not determine the default Steam library folder from the registry.');
      }
    } catch (err) {
      showErrorToast(`Unexpected error: ${String(err)}`);
    } finally {
      setIsResettingSteamPath(false);
    }
  }, [getDefaultSteamapps, appId, commit]);

  return {
    steamPath,
    appId,
    target,
    setAppId,
    readCurrent,
    changeSteamPath,
    resetSteamPath,
    isResettingSteamPath,
  };
};
