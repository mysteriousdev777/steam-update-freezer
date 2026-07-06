import { useEffect, useState } from 'react';

import type { DonateConfig } from '@/shared/types';

import {
  DEFAULT_DONATE_FLAGS,
  getCachedDonateFlags,
  resolveDonateConfig,
  setCachedDonateFlags,
} from '@/renderer/lib/donate';

/**
 * Effective donation config: remote flags with a three-tier fallback (live via main → cached →
 * all-visible default) applied over the baked-in targets. Seeds the first render synchronously from
 * cache/default so nothing flashes in, then reconciles with the live flags and re-caches.
 */
export const useDonateConfig = (): DonateConfig => {
  const [flags, setFlags] = useState(() => getCachedDonateFlags() ?? DEFAULT_DONATE_FLAGS);

  useEffect(() => {
    let isActive = true;

    window.freezer
      .getDonateFlags()
      .then(remote => {
        if (!isActive || !remote) return;

        setCachedDonateFlags(remote);
        setFlags(remote);
      })
      // On failure the synchronously-seeded cache/default already on screen stays.
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, []);

  return resolveDonateConfig(flags);
};
