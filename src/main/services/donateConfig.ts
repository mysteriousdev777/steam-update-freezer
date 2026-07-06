import type { DonateFlags } from '@/shared/types';

// Revision-less raw URL: always serves the latest gist revision, so an edit propagates without an
// app update (a pinned SHA would freeze it).
const DONATE_CONFIG_URL =
  'https://gist.githubusercontent.com/mysteriousdev777/b76905f42be038ee880b6910c414b127/raw/config.json';

// Short timeout: a slow/blocked network should fall back to the cache/default quickly, not hang.
const TIMEOUT_MS = 5000;

/**
 * Fetches and resolves the remote flags. Never throws — network/timeout, non-2xx, bad JSON, or a
 * malformed payload all resolve to null so the renderer can fall back. See {@link resolveDonateFlags}.
 */
export async function fetchDonateFlags(): Promise<DonateFlags | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;

  try {
    res = await fetch(DONATE_CONFIG_URL, { signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) return null;

  try {
    return resolveDonateFlags(await res.json());
  } catch {
    return null;
  }
}

/**
 * Raw config.json shape — an untrusted contract, so every field is optional and read defensively by
 * resolveDonateFlags. `crypto.wallets` maps a baked-in wallet id (DONATE_DATA) to its visibility.
 */
type DonateRemoteConfig = {
  donations?: {
    enabled?: boolean;
    kofi?: { enabled?: boolean };
    crypto?: {
      enabled?: boolean;
      wallets?: Record<string, boolean>;
    };
  };
};

/**
 * Flattens the untrusted config.json into DonateFlags: each section must be enabled to show, so a
 * partial/typo'd config errs toward hidden. Null only on a malformed payload (no `donations` object)
 * so the renderer can fall back; a well-formed "everything off" resolves to empty flags, not null.
 */
function resolveDonateFlags(json: unknown): DonateFlags | null {
  if (!json || typeof json !== 'object') return null;

  const { donations } = json as DonateRemoteConfig;

  if (!donations || typeof donations !== 'object') return null;

  // Global kill-switch — everything off, sections aside.
  if (donations.enabled !== true) return { kofi: false, wallets: [] };

  const kofi = donations.kofi?.enabled === true;

  const cryptoCfg = donations.crypto;
  const walletFlags = cryptoCfg?.enabled === true ? cryptoCfg.wallets : undefined;
  const wallets = walletFlags
    ? Object.entries(walletFlags)
        .filter(([, isEnabled]) => isEnabled)
        .map(([id]) => id)
    : [];

  return { kofi, wallets };
}
