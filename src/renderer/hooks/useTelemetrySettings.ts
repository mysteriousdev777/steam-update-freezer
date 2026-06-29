import { useCallback, useState } from 'react';

import { getStoredTelemetryEnabled, setStoredTelemetryEnabled } from '@/renderer/lib/settings';

/**
 * Analytics opt-out preference (Settings -> Privacy), backed by localStorage. Read on mount so the
 * switch renders in its real state (no flash) and written through on flip. Drives only the UI — the
 * actual gating lives in useAnalytics.
 */
export const useTelemetrySettings = () => {
  const [isTelemetryEnabled, setIsTelemetryEnabled] = useState(getStoredTelemetryEnabled);

  const setTelemetryEnabled = useCallback((isEnabled: boolean) => {
    setIsTelemetryEnabled(isEnabled);
    setStoredTelemetryEnabled(isEnabled);
  }, []);

  return { isTelemetryEnabled, setTelemetryEnabled };
};
