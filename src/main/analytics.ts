// Aptabase analytics. Lives at main/ (not services/) since the SDK imports `electron`. Fires only
// from a packaged build with an Aptabase key, and is opt-out in the renderer (Settings -> Privacy).
import { app } from 'electron';

import { initialize, trackEvent as sendEvent } from '@aptabase/electron/main';

import type { AnalyticsEvent, AnalyticsProps } from '@/shared/types';

import { APTABASE_APP_KEY } from '@/shared/env';

// Keep dev builds out of the dashboard. Flip to `true` to send from a dev build while testing.
const CAN_SEND_ANALYTICS_IN_DEV = false;

// Packaged builds only, unless the dev override is on; the key is checked separately at each call.
const canSendInThisBuild = app.isPackaged || CAN_SEND_ANALYTICS_IN_DEV;

/**
 * Initializes Aptabase. MUST run before the app 'ready' event (an SDK requirement — it registers a
 * privileged scheme and awaits readiness internally). A no-op when analytics are disabled, so we
 * never set anything up in dev or unofficial builds.
 */
export function initAnalytics(): void {
  if (!APTABASE_APP_KEY || !canSendInThisBuild) return;

  void initialize(APTABASE_APP_KEY);
}

/** Forwards a renderer analytics event to Aptabase. No-op when analytics are disabled. */
export function trackEvent(eventName: AnalyticsEvent, props?: AnalyticsProps): void {
  if (!APTABASE_APP_KEY || !canSendInThisBuild) return;

  void sendEvent(eventName, props);
}
