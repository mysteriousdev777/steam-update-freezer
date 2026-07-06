import { useEffect, useRef, useState, type FC } from 'react';

import { Check, Copy, Heart, Wallet } from 'lucide-react';

import type { CryptoWallet } from '@/shared/types';

import { AppButton } from '@/renderer/components/AppButton';

import { useCopyToClipboard } from '@/renderer/hooks/useCopyToClipboard';
import { useDonateConfig } from '@/renderer/hooks/useDonateConfig';
import { useOpenExternal } from '@/renderer/hooks/useOpenExternal';

import { cn } from '@/renderer/lib/cn';

const CryptoAddressRow: FC<{ wallet: CryptoWallet }> = ({ wallet }) => {
  const { copy, isCopied } = useCopyToClipboard();

  return (
    <div className="flex items-center gap-3 rounded border border-white/5 bg-black/20 px-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-steam-text">{wallet.name}</span>
          <span className="text-xs text-steam-muted">{wallet.network}</span>
        </div>
        <span className="truncate font-mono text-xs text-steam-text/80" title={wallet.address}>
          {wallet.address}
        </span>
      </div>
      <AppButton
        icon={isCopied ? Check : Copy}
        onClick={() => void copy(wallet.address)}
        className={cn(
          'shrink-0 px-2 py-1 text-xs',
          isCopied ? 'text-steam-ok' : 'text-steam-muted hover:bg-white/10 hover:text-steam-text',
        )}
        aria-label={`Copy ${wallet.name} address`}
        title="Copy address"
      >
        {isCopied ? 'Copied' : 'Copy'}
      </AppButton>
    </div>
  );
};

// Unobtrusive support section at the bottom of the About tab: a Ko-fi link plus a collapsed
// crypto-wallet list. Both are baked in but gated by remote flags (useDonateConfig), so either can
// be hidden without an app update; renders nothing when the remote (or its offline cache) hides both.
export const DonateBlock: FC = () => {
  const openExternal = useOpenExternal();
  const config = useDonateConfig();
  const [isCryptoOpen, setIsCryptoOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll the freshly-revealed wallet list into view (mirrors ManifestInfo's expand behavior).
  useEffect(() => {
    if (isCryptoOpen) {
      const timer = setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [isCryptoOpen]);

  // Both targets hidden (remotely, or a config with neither) → render nothing.
  if (!config.kofiUrl && config.wallets.length === 0) return null;

  const { kofiUrl, wallets } = config;
  const hasWallets = wallets.length > 0;

  return (
    <div
      className="flex flex-col gap-4 scroll-mb-6 border-t border-white/5 pt-6"
      ref={containerRef}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Heart className="size-4 text-steam-muted" />
          <h2 className="text-xs font-medium uppercase tracking-wider text-steam-label">
            Say thanks
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-steam-muted">
          This app is completely free and open-source. If it helped you out and you&apos;d like to
          say thanks, a small tip is deeply appreciated — but entirely optional.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {kofiUrl && (
          <AppButton
            icon={Heart}
            onClick={() => void openExternal(kofiUrl)}
            className="border border-white/10 bg-black/20 px-4 py-2 text-sm text-steam-text hover:border-steam-accent hover:text-steam-accent"
          >
            Support on Ko-Fi
          </AppButton>
        )}

        {kofiUrl && hasWallets && (
          <span className="text-xs font-medium text-steam-muted opacity-50 uppercase">or</span>
        )}

        {hasWallets && (
          <AppButton
            icon={Wallet}
            onClick={() => setIsCryptoOpen(open => !open)}
            className={cn(
              'py-2 pr-3 text-sm',
              isCryptoOpen ? 'text-steam-text' : 'text-steam-muted hover:text-steam-text',
            )}
            aria-expanded={isCryptoOpen}
          >
            {isCryptoOpen ? 'Hide crypto wallets' : 'Support with crypto'}
          </AppButton>
        )}
      </div>

      {hasWallets && isCryptoOpen && (
        <div className="flex flex-col gap-2">
          {wallets.map(wallet => (
            <CryptoAddressRow key={wallet.id} wallet={wallet} />
          ))}
        </div>
      )}
    </div>
  );
};
