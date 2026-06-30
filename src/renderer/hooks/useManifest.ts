import { useCallback, useEffect, useState } from 'react';

import type { AppManifest } from '@/shared/types';

import { useReadManifest } from '@/renderer/hooks/useReadManifest';

/**
 * A committed read target. A fresh object on every commit (see useSteamTarget) so re-committing
 * an unchanged value still re-reads — drives Enter-to-retry and Refresh.
 */
export type ReadTarget = { path: string; id: string };

/** Post-write state a write action pushes back into the read state. */
type WriteResult = { manifest?: AppManifest; isReadonly: boolean };

/** Owns the manifest read state: reads on each committed `target`, clears it while the draft is edited. */
export const useManifest = (steamPath: string, appId: string, target: ReadTarget | null) => {
  const readManifest = useReadManifest();

  const [manifest, setManifest] = useState<AppManifest | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  // Read-only state; null until known (after a read or write).
  const [isManifestReadonly, setIsManifestReadonly] = useState<boolean | null>(null);

  // Editing the target invalidates what we knew about the previous manifest.
  useEffect(() => {
    setManifest(null);
    setIsManifestReadonly(null);
    setReadError(null);
  }, [steamPath, appId]);

  // Read on each committed target; the guard drops a superseded/late read instead of writing dead state.
  useEffect(() => {
    if (!target) return;

    let isCancelled = false;
    setIsReading(true);

    readManifest(target.path, target.id)
      .then(result => {
        if (isCancelled) return;

        if (result.ok) {
          setManifest(result.manifest);
          setIsManifestReadonly(result.isReadonly);
          setReadError(null);
        } else {
          setManifest(null);
          // Read failed → read-only state is unknown again, so clear it (a refresh of the same
          // target won't hit the steamPath/appId reset effect). Stale state would otherwise feed
          // the quit guard a wrong "unblocked" signal.
          setIsManifestReadonly(null);
          setReadError(result.error.message);
        }
      })
      .catch(err => {
        if (!isCancelled) setReadError(`Unexpected error: ${String(err)}`);
      })
      .finally(() => {
        if (!isCancelled) setIsReading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [target, readManifest]);

  // Write actions (lock/unlock/update) push their post-write state in without a re-read.
  const applyWriteResult = useCallback((result: WriteResult) => {
    if (result.manifest) setManifest(result.manifest);

    setIsManifestReadonly(result.isReadonly);
  }, []);

  return { manifest, isReading, readError, isManifestReadonly, applyWriteResult };
};
