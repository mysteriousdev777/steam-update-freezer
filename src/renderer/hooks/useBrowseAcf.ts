import { useCallback } from 'react';

import { showErrorToast } from '../lib/toast';

/**
 * Manual target for install paths the scan doesn't find: opens a native file picker for the
 * .acf directly, and on success forwards its library folder + App ID to `onPicked` (the
 * same target-setting path as a normal game pick). Cancelling is silent; anything else
 * (bad filename, unexpected error) shows a toast.
 */
export const useBrowseAcf = (onPicked: (steamappsPath: string, appId: string) => void) =>
  useCallback(async () => {
    try {
      const result = await window.freezer.pickAcfFile();

      if (result.ok) {
        onPicked(result.steamappsPath, result.appId);
      } else if (result.reason === 'invalid-name') {
        showErrorToast(
          `"${result.fileName}" isn't named appmanifest_<appid>.acf — pick the original file.`,
        );
      }
    } catch (err) {
      showErrorToast(`Unexpected error: ${String(err)}`);
    }
  }, [onPicked]);
