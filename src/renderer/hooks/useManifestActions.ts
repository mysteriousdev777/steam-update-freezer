import { useCallback, useState } from 'react';

import type { AppManifest, ConfirmationSettings, ConfirmOptions } from '@/shared/types';

import { showErrorToast, showSuccessToast } from '@/renderer/lib/toast';

import { useConfirm } from './useConfirm';
import { useFreezeManifest } from './useFreezeManifest';
import { useRestoreManifest } from './useRestoreManifest';
import { useUpdateManifest } from './useUpdateManifest';

type UseManifestActionsArgs = {
  steamPath: string;
  appId: string;
  isManifestReadonly: boolean | null;
  applyWriteResult: (result: { manifest?: AppManifest; isReadonly: boolean }) => void;
  confirmations: ConfirmationSettings;
};

/**
 * Manifest write actions: block (lock read-only), unblock (restore the genuine manifest from the
 * backup, then unlock), update (rewrite to the current public build, then lock). Owns busy state +
 * per-action enablement; pushes results back via `applyWriteResult`.
 */
export const useManifestActions = ({
  steamPath,
  appId,
  isManifestReadonly,
  applyWriteResult,
  confirmations,
}: UseManifestActionsArgs) => {
  const freezeManifest = useFreezeManifest();
  const restoreManifest = useRestoreManifest();
  const updateManifest = useUpdateManifest();
  const confirm = useConfirm();

  // Show the confirm dialog only when this action's confirmation is enabled; otherwise proceed.
  // Gates the prompt, not the safety guard — Steam-closed checks still run in the service.
  const confirmIfEnabled = useCallback(
    (isEnabled: boolean, options: ConfirmOptions): Promise<boolean> =>
      isEnabled ? confirm(options) : Promise.resolve(true),
    [confirm],
  );

  const [busyAction, setBusyAction] = useState<'lock' | 'unlock' | 'update' | null>(null);

  const canWrite = Boolean(steamPath && appId) && busyAction === null;
  // Offer each toggle only when it would change the current state.
  const canBlock = canWrite && isManifestReadonly === false;
  const canUnblock = canWrite && isManifestReadonly === true;
  // Frozen-only: on an unfrozen game the honest freeze is Block, not a rewrite to the public build.
  const canUpdate = canWrite && isManifestReadonly === true;

  // Block: snapshot the genuine manifest to the backup, then lock read-only. Writes a backup, so
  // Steam must be closed — confirm first.
  const block = useCallback(async () => {
    const isConfirmed = await confirmIfEnabled(confirmations.block, {
      message: 'Block game updates?',
      detail:
        'Saves a backup of the current version (.acf.bak) and locks the manifest. Steam must be closed.',
    });

    if (!isConfirmed) return;

    setBusyAction('lock');
    try {
      const result = await freezeManifest(steamPath, appId);

      if (result.ok) {
        applyWriteResult({ isReadonly: result.isReadonly });
        showSuccessToast('Game updates are now blocked.');
      } else {
        showErrorToast(result.error.message);
      }
    } catch (err) {
      showErrorToast(`Unexpected error: ${String(err)}`);
    } finally {
      setBusyAction(null);
    }
  }, [confirmIfEnabled, confirmations.block, freezeManifest, steamPath, appId, applyWriteResult]);

  // Unblock: restore the genuine manifest from the backup, then unlock. Rewrites the .acf
  // (restoring the true installed build so SteamPipe's delta stays correct), so Steam must be closed.
  const unblock = useCallback(async () => {
    const isConfirmed = await confirmIfEnabled(confirmations.unblock, {
      message: 'Unblock game update?',
      variant: 'danger',
      detail:
        'Restores the original manifest from the backup and lets Steam update this game again. Steam must be closed.',
    });

    if (!isConfirmed) return;

    setBusyAction('unlock');
    try {
      const result = await restoreManifest(steamPath, appId);

      if (result.ok) {
        applyWriteResult({ manifest: result.manifest, isReadonly: result.isReadonly });
        showSuccessToast('Original manifest restored — updates unblocked.');
      } else {
        showErrorToast(result.error.message);
      }
    } catch (err) {
      showErrorToast(`Unexpected error: ${String(err)}`);
    } finally {
      setBusyAction(null);
    }
  }, [
    confirmIfEnabled,
    confirmations.unblock,
    restoreManifest,
    steamPath,
    appId,
    applyWriteResult,
  ]);

  const update = useCallback(async () => {
    const isConfirmed = await confirmIfEnabled(confirmations.update, {
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

        if (result.isChanged) {
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
  }, [confirmIfEnabled, confirmations.update, updateManifest, steamPath, appId, applyWriteResult]);

  return { busyAction, canWrite, canBlock, canUnblock, canUpdate, block, unblock, update };
};
