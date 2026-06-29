import { useCallback } from 'react';

import { showErrorToast } from '@/renderer/lib/toast';

/**
 * Renderer seam for opening an https link in the OS default browser.
 */
export const useOpenExternal = () =>
  useCallback((url: string) => {
    window.freezer
      .openExternal(url)
      .catch(err => showErrorToast(`Unexpected error: ${String(err)}`));
  }, []);
