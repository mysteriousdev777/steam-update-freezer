import { useCallback, useState } from 'react';

import type { ConfirmationKey } from '@/shared/types';

import { getStoredConfirmations, setStoredConfirmation } from '@/renderer/lib/settings';

/**
 * Confirmation preferences (Settings -> Confirmations), backed by localStorage. Read synchronously
 * on mount so switches render in their real state (no flash), and each toggle is written through as
 * it flips. Lifted to <App/> so the quit guard reacts to the live `quit` value.
 */
export const useConfirmationSettings = () => {
  const [confirmations, setConfirmations] = useState(getStoredConfirmations);

  const setConfirmation = useCallback((key: ConfirmationKey, isEnabled: boolean) => {
    setConfirmations(prev => ({ ...prev, [key]: isEnabled }));
    setStoredConfirmation(key, isEnabled);
  }, []);

  return { confirmations, setConfirmation };
};
