import { useEffect } from 'react';

import { useConfirm } from '@/renderer/hooks/useConfirm';
import { useReportQuitGuard } from '@/renderer/hooks/useReportQuitGuard';

/**
 * Guards quitting while updates are unblocked: reports to main whether a quit should be guarded
 * (updates unblocked AND the quit confirmation enabled), and confirms with the user when main
 * intercepts a quit.
 */
export const useQuitGuard = (isUpdateUnblocked: boolean, isQuitConfirmEnabled: boolean) => {
  const confirm = useConfirm();
  const reportQuitGuard = useReportQuitGuard();

  // Quit requests from main (updates unblocked). Cleanup unsubscribes, else re-registration leaks.
  useEffect(() => {
    const unsubscribe = window.freezer.onQuitRequest(() => {
      void (async () => {
        const isConfirmed = await confirm({
          message: 'Quit with game updates unblocked?',
          detail: 'Steam will be free to update this game the next time it opens. Quit anyway?',
          variant: 'danger',
          confirmLabel: 'Quit',
        });

        if (isConfirmed) {
          await window.freezer.confirmQuit();
        }
      })();
    });

    return unsubscribe;
  }, [confirm]);

  // Guard a quit only when updates are unblocked AND the user kept the quit confirmation on.
  useEffect(() => {
    void reportQuitGuard(isUpdateUnblocked && isQuitConfirmEnabled);
  }, [isUpdateUnblocked, isQuitConfirmEnabled, reportQuitGuard]);
};
