import { useEffect, useState } from 'react';

import type { AppInfo } from '@/shared/types';

import { showErrorToast } from '@/renderer/lib/toast';

const EMPTY_APP_INFO: AppInfo = { version: '', author: '' };

/**
 * Display metadata (version + author), read once from main (package.json) for the About
 * screen. Empty until the round-trip resolves.
 */
export const useAppInfo = (): AppInfo => {
  const [info, setInfo] = useState<AppInfo>(EMPTY_APP_INFO);

  useEffect(() => {
    window.freezer
      .getAppInfo()
      .then(setInfo)
      .catch(err => showErrorToast(`Unexpected error: ${String(err)}`));
  }, []);

  return info;
};
