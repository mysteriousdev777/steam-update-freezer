import type { DonateConfig, DonateFlags } from '@/shared/types';

import { storage } from '@/renderer/lib/storage';

// Baked-in donation targets (Ko-fi URL + wallet addresses). These always ship with the app; the
// remote config only toggles their visibility (see DonateFlags / useDonateConfig).
export const DONATE_DATA: DonateConfig = {
  kofiUrl: 'https://ko-fi.com/mysteriousdev777',
  // One EVM address covers every EVM chain (Ethereum, Polygon, Arbitrum, Base, BNB, …)
  wallets: [
    {
      id: 'evm',
      name: 'EVM',
      network: 'Ethereum, BSC, Polygon, Arbitrum, Base & any EVM chain',
      address: '0xd571d33dfdbef696663e7673f9ca35beabe3fcf8',
    },
    {
      id: 'tron',
      name: 'Tron',
      network: 'USDT (TRC20), TRX',
      address: 'TE9yJPTk6GoNA1jW1wf6JZcL6Vs5HHgsuP',
    },
    {
      id: 'solana',
      name: 'Solana',
      network: 'SOL, USDT, USDC',
      address: '5pyw2t3urEo9Rxs9cGC9yZCxMs5thTjynQ7o4ejdeh4X',
    },
    {
      id: 'bitcoin',
      name: 'Bitcoin',
      network: 'BTC (native SegWit)',
      address: 'bc1qwnmzm892xaf6zurt6jln069vswmrgv64mx0s66',
    },
  ],
};

// Visibility when no remote flags and no cache exist yet (first launch, offline): show everything.
// The remote exists only to *hide* targets, so its absence means all-visible.
export const DEFAULT_DONATE_FLAGS: DonateFlags = {
  kofi: true,
  wallets: DONATE_DATA.wallets.map(wallet => wallet.id),
};

// Applies the remote flags over the baked-in targets → the effective config DonateBlock renders.
export const resolveDonateConfig = (flags: DonateFlags): DonateConfig => ({
  kofiUrl: flags.kofi ? DONATE_DATA.kofiUrl : null,
  wallets: DONATE_DATA.wallets.filter(wallet => flags.wallets.includes(wallet.id)),
});

// Last flags that fetched successfully. Persisted so a remotely hidden target stays hidden across
// restarts and offline launches — see useDonateConfig.
const DONATE_FLAGS_CACHE_KEY = 'freezer.donateFlags';

/** The cached remote flags, or null if none/unparseable. */
export const getCachedDonateFlags = (): DonateFlags | null => {
  const raw = storage.read(DONATE_FLAGS_CACHE_KEY);

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<DonateFlags>;

    if (typeof parsed.kofi !== 'boolean' || !Array.isArray(parsed.wallets)) return null;

    // Drop any non-string ids a tampered cache might inject; the rest feed flags.wallets.includes.
    return { kofi: parsed.kofi, wallets: parsed.wallets.filter(id => typeof id === 'string') };
  } catch {
    return null;
  }
};

/** Persists the latest remote flags for the next launch / offline fallback. */
export const setCachedDonateFlags = (flags: DonateFlags): void =>
  storage.write(DONATE_FLAGS_CACHE_KEY, JSON.stringify(flags));
