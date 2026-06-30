import { useCallback, useState } from 'react';

import type { AppManifest, ConfirmationSettings, ConfirmOptions } from '@/shared/types';

import { useAnalytics } from '@/renderer/hooks/useAnalytics';
import { useConfirm } from '@/renderer/hooks/useConfirm';
import { useFreezeManifest } from '@/renderer/hooks/useFreezeManifest';
import { useRestoreManifest } from '@/renderer/hooks/useRestoreManifest';
import { useUpdateManifest } from '@/renderer/hooks/useUpdateManifest';

import { showErrorToast, showSuccessToast } from '@/renderer/lib/toast';

type UseManifestActionsArgs = {
  steamPath: string;
  appId: string;
  isManifestReadonly: boolean | null;
  // True while a manifest read/refresh is in flight — gates actions so a late read can't
  // overwrite a just-written state (see canWrite).
  isReading: boolean;
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
  isReading,
  applyWriteResult,
  confirmations,
}: UseManifestActionsArgs) => {
  const freezeManifest = useFreezeManifest();
  const restoreManifest = useRestoreManifest();
  const updateManifest = useUpdateManifest();
  const confirm = useConfirm();
  const trackEvent = useAnalytics();

  // Show the confirm dialog only when this action's confirmation is enabled; otherwise proceed.
  // Gates the prompt, not the safety guard — Steam-closed checks still run in the service.
  const confirmIfEnabled = useCallback(
    (isEnabled: boolean, options: ConfirmOptions): Promise<boolean> =>
      isEnabled ? confirm(options) : Promise.resolve(true),
    [confirm],
  );

  const [busyAction, setBusyAction] = useState<'lock' | 'unlock' | 'update' | null>(null);

  // Block writes while a read/refresh is in flight: the read isn't cancelled by a write, so a
  // late-resolving read would otherwise clobber the post-write state with a stale disk snapshot.
  const canWrite = Boolean(steamPath && appId) && busyAction === null && !isReading;
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
        'Locks the current manifest read-only so Steam stops updating this game. Your original is backed up first.',
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
      message: 'Unblock game updates?',
      variant: 'danger',
      detail:
        'Restores the original manifest from the backup and unlocks it, so Steam can update this game again.',
      note: "Edited this game's manifest files outside the app? The backup may not match what's installed — verify the game's files in Steam afterward.",
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
        'Rewrites the manifest to the current public build and locks it, so Steam skips the pending update. Your original is backed up first.',
    });

    if (!isConfirmed) return;

    setBusyAction('update');
    try {
      const result = await updateManifest(steamPath, appId);

      if (result.ok) {
        applyWriteResult({ manifest: result.manifest, isReadonly: result.isReadonly });
        // Anonymous product context: which game/build was pinned, and whether anything changed.
        // Aptabase aggregates each property independently, so buildId is only meaningful paired with
        // the game — hence the composite key (a standalone buildId across all games says nothing).
        trackEvent('manifest_updated', {
          name: result.manifest.name,
          gameBuild: `${result.manifest.name} (${result.manifest.appId}) @ ${result.manifest.buildId}`,
          isChanged: result.isChanged,
        });

        if (result.isChanged) {
          showSuccessToast(
            `Manifest updated to build ${result.manifest.buildId} — updates blocked.`,
          );
        } else {
          // Nothing rewritten — the manifest already claims the current public build.
          showSuccessToast(`Already at the current public build ${result.manifest.buildId}.`);
        }
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
    confirmations.update,
    updateManifest,
    steamPath,
    appId,
    applyWriteResult,
    trackEvent,
  ]);

  return { busyAction, canWrite, canBlock, canUnblock, canUpdate, block, unblock, update };
};
