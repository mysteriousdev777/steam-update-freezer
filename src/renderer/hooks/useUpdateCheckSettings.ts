import { useCallback, useState } from 'react';

import { getStoredUpdateCheckEnabled, setStoredUpdateCheckEnabled } from '@/renderer/lib/settings';

/**
 * Update-check preference (Settings -> Updates), backed by localStorage. Read on mount so the switch
 * renders in its real state (no flash) and written through on flip. Also gates useUpdateCheck: when
 * off, the badge hides and no GitHub request is made.
 */
export const useUpdateCheckSettings = () => {
  const [isUpdateCheckEnabled, setIsUpdateCheckEnabled] = useState(getStoredUpdateCheckEnabled);

  const setUpdateCheckEnabled = useCallback((isEnabled: boolean) => {
    setIsUpdateCheckEnabled(isEnabled);
    setStoredUpdateCheckEnabled(isEnabled);
  }, []);

  return { isUpdateCheckEnabled, setUpdateCheckEnabled };
};
