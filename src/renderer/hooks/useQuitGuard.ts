import { useEffect } from 'react';

import { useConfirm } from './useConfirm';
import { useReportUpdateUnblocked } from './useReportUpdateUnblocked';

/**
 * Guards quitting while updates are unblocked: reports the state to main, and confirms with the
 * user when main intercepts a quit.
 */
export const useQuitGuard = (isUpdateUnblocked: boolean) => {
  const confirm = useConfirm();
  const reportUpdateUnblocked = useReportUpdateUnblocked();

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

  // Keep main informed so it can guard a quit while unblocked.
  useEffect(() => {
    void reportUpdateUnblocked(isUpdateUnblocked);
  }, [isUpdateUnblocked, reportUpdateUnblocked]);
};
