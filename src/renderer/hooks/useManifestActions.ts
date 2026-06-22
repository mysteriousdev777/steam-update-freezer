import { useCallback, useState } from 'react';

import type { AppManifest } from '../../shared/types';
import { showErrorToast, showSuccessToast } from '../lib/toast';
import { useConfirm } from './useConfirm';
import { useSetManifestReadonly } from './useSetManifestReadonly';
import { useUpdateManifest } from './useUpdateManifest';

type UseManifestActionsArgs = {
  steamPath: string;
  appId: string;
  isManifestReadonly: boolean | null;
  applyWriteResult: (result: { manifest?: AppManifest; isReadonly: boolean }) => void;
};

/**
 * Manifest write actions: block (lock read-only), unblock (drop the freeze), update (rewrite to
 * the current public build, then lock). Owns busy state + per-action enablement; pushes results
 * back via `applyWriteResult`.
 */
export const useManifestActions = ({
  steamPath,
  appId,
  isManifestReadonly,
  applyWriteResult,
}: UseManifestActionsArgs) => {
  const setManifestReadonly = useSetManifestReadonly();
  const updateManifest = useUpdateManifest();
  const confirm = useConfirm();

  const [busyAction, setBusyAction] = useState<'lock' | 'unlock' | 'update' | null>(null);

  const canWrite = Boolean(steamPath && appId) && busyAction === null;
  // Offer each toggle only when it would change the current state.
  const canBlock = canWrite && isManifestReadonly === false;
  const canUnblock = canWrite && isManifestReadonly === true;

  const setReadonly = useCallback(
    async (isReadonly: boolean) => {
      // Unblocking drops the freeze (Steam may update again) — confirm first.
      if (!isReadonly) {
        const isConfirmed = await confirm({
          message: 'Unblock game update?',
          detail: 'Steam will be allowed to update this game again, removing the freeze.',
        });

        if (!isConfirmed) return;
      }

      setBusyAction(isReadonly ? 'lock' : 'unlock');
      try {
        const result = await setManifestReadonly(steamPath, appId, isReadonly);

        if (result.ok) {
          applyWriteResult({ isReadonly: result.isReadonly });
          showSuccessToast(`Game updates are now ${result.isReadonly ? 'blocked' : 'unblocked'}.`);
        } else {
          showErrorToast(result.error.message);
        }
      } catch (err) {
        showErrorToast(`Unexpected error: ${String(err)}`);
      } finally {
        setBusyAction(null);
      }
    },
    [confirm, setManifestReadonly, steamPath, appId, applyWriteResult],
  );

  const update = useCallback(async () => {
    const isConfirmed = await confirm({
      message: 'Update manifest to the current public build?',
      detail:
        'Rewrites the .acf and locks it read-only (a .acf.bak backup is made first). Steam must be closed.',
    });

    if (!isConfirmed) return;

    setBusyAction('update');
    try {
      const result = await updateManifest(steamPath, appId);

      if (result.ok) {
        applyWriteResult({ manifest: result.manifest, isReadonly: result.isReadonly });

        if (result.changed) {
          showSuccessToast(
            `Manifest updated to build ${result.manifest.buildId} — updates blocked.`,
          );
        } else {
          // Nothing rewritten — already at the public build. Note the lock state as-is.
          const lockNote = result.isReadonly ? ' — updates blocked' : '';
          showSuccessToast(
            `Already at the current public build ${result.manifest.buildId}${lockNote}.`,
          );
        }
      } else {
        showErrorToast(result.error.message);
      }
    } catch (err) {
      showErrorToast(`Unexpected error: ${String(err)}`);
    } finally {
      setBusyAction(null);
    }
  }, [confirm, updateManifest, steamPath, appId, applyWriteResult]);

  return { busyAction, canWrite, canBlock, canUnblock, setReadonly, update };
};
