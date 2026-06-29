import { useCallback } from 'react';

import type { AnalyticsEvent, AnalyticsProps } from '@/shared/types';

import { getStoredTelemetryEnabled } from '@/renderer/lib/settings';

/**
 * Analytics seam (the renderer's only tracking bridge). Returns a stable `trackEvent` that forwards
 * to main unless the user opted out — read fresh each call so a toggle applies at once. Main also
 * no-ops without an Aptabase key (dev/unofficial builds).
 */
export const useAnalytics = () =>
  useCallback((eventName: AnalyticsEvent, props?: AnalyticsProps) => {
    if (!getStoredTelemetryEnabled()) return;

    void window.freezer.trackEvent(eventName, props);
  }, []);
