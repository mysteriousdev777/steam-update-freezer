import { useEffect } from 'react';

import { useAnalytics } from './useAnalytics';

/** Fires one `app_opened` analytics event per launch (no-op if the user opted out — see useAnalytics). */
export const useTrackAppOpen = () => {
  const trackEvent = useAnalytics();

  useEffect(() => {
    trackEvent('app_opened');
  }, [trackEvent]);
};
