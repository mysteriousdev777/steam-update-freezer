import { useCallback, useState } from 'react';

import { showErrorToast } from '@/renderer/lib/toast';

/**
 * Owns its own busy state since it's a
 * standalone action with no surrounding manifest write to track it.
 */
export const useRestoreDefaultWindowSize = () => {
  const [isBusy, setIsBusy] = useState(false);

  const restoreDefaultWindowSize = useCallback(async () => {
    setIsBusy(true);
    try {
      await window.freezer.restoreDefaultWindowSize();
    } catch (err) {
      showErrorToast(`Unexpected error: ${String(err)}`);
    } finally {
      setIsBusy(false);
    }
  }, []);

  return { restoreDefaultWindowSize, isBusy };
};
