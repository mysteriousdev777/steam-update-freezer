import { useCallback, useEffect, useRef, useState } from 'react';

import { showErrorToast } from '@/renderer/lib/toast';

const COPIED_FEEDBACK_MS = 1500;

/**
 * Copies text to the OS clipboard (via main). `isCopied` flips true on success then reverts;
 * failures toast. Stateful — one hook per copy button.
 */
export const useCopyToClipboard = () => {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Clear a pending revert if the consumer unmounts mid-timeout.
  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const copy = useCallback(async (text: string): Promise<void> => {
    try {
      await window.freezer.copyToClipboard(text);

      setIsCopied(true);
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
    } catch (err) {
      showErrorToast(`Copy failed: ${String(err)}`);
    }
  }, []);

  return { copy, isCopied };
};
