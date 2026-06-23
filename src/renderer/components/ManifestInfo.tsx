import { useState, useEffect, useRef, type FC } from 'react';
import { ChevronRight, RefreshCw } from 'lucide-react';

import { cn } from '../lib/cn';
import { AppButton } from './AppButton';
import type { AppManifest } from '../../shared/types';

type ManifestInfoProps = {
  manifest: AppManifest;
  isReadonly: boolean | null;
  onRefresh: () => void;
  isRefreshing?: boolean;
};

export const ManifestInfo: FC<ManifestInfoProps> = ({
  manifest,
  isReadonly,
  onRefresh,
  isRefreshing = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  return (
    <div className="flex flex-col scroll-mb-6" ref={containerRef}>
      <div className="flex flex-col rounded border border-white/5 bg-black/20">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[22px] font-bold tracking-tight text-white">
              {manifest.name || '(unnamed app)'}
            </span>
            <span className="text-xs text-steam-muted">App ID: {manifest.appId || '—'}</span>
          </div>
          {isReadonly !== null && (
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="text-xs text-steam-muted">Update status</span>
              <span
                className={cn(
                  'text-xl font-bold',
                  isReadonly ? 'text-steam-ok' : 'text-action-unfreeze-hover',
                )}
              >
                {isReadonly ? 'blocked 🔒' : 'allowed 🔓'}
              </span>
            </div>
          )}
          <AppButton
            icon={RefreshCw}
            isBusy={isRefreshing}
            onClick={onRefresh}
            title="Refresh manifest"
            aria-label="Refresh manifest"
            className="shrink-0 border border-white/5 p-2 text-steam-accent hover:border-steam-accent hover:bg-white/5"
          />
        </div>

        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-200 ease-in-out',
            isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col gap-5 border-t border-white/5 px-4 py-4 text-sm">
              <div>
                <div className="mb-2 font-medium text-steam-label">General info</div>
                <div className="overflow-hidden rounded border border-white/10 bg-black/10">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-black/20 text-left text-xs font-medium uppercase tracking-wider text-steam-label">
                        <th className="w-32 px-4 py-2">Property</th>
                        <th className="px-4 py-2">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-[13px] text-steam-text">
                      <tr className="transition-colors hover:bg-white/5">
                        <td className="px-4 py-2">Build ID</td>
                        <td className="px-4 py-2 font-mono text-steam-muted">
                          {manifest.buildId || '—'}
                        </td>
                      </tr>
                      <tr className="transition-colors hover:bg-white/5">
                        <td className="px-4 py-2">State flags</td>
                        <td className="px-4 py-2 font-mono text-steam-muted">
                          {manifest.stateFlags || '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="mb-2 font-medium text-steam-label">Installed depots</div>
                {manifest.installedDepots.length === 0 ? (
                  <div className="text-steam-muted">(none)</div>
                ) : (
                  <div className="overflow-hidden rounded border border-white/10 bg-black/10">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-black/20 text-left text-xs font-medium uppercase tracking-wider text-steam-label">
                          <th className="w-32 px-4 py-2">Depot</th>
                          <th className="px-4 py-2">Manifest</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono text-[13px] text-steam-text">
                        {manifest.installedDepots.map(depot => (
                          <tr key={depot.depotId} className="transition-colors hover:bg-white/5">
                            <td className="px-4 py-2">{depot.depotId}</td>
                            <td className="px-4 py-2 text-steam-muted">{depot.manifest}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <AppButton
        icon={ChevronRight}
        onClick={() => setIsExpanded(prev => !prev)}
        className={cn(
          'w-full justify-center py-2.5 text-xs font-medium uppercase tracking-widest text-steam-accent',
          'transition-all hover:text-white',
          'bg-[linear-gradient(90deg,rgba(0,0,0,0)_0%,rgb(37_63_96/50%)_33%,rgb(37_63_96/50%)_66%,rgba(0,0,0,0)_100%)]',
          'hover:bg-[linear-gradient(90deg,rgba(0,0,0,0)_0%,rgb(37_63_96/70%)_33%,rgb(37_63_96/70%)_66%,rgba(0,0,0,0)_100%)]',
          '[&_svg]:transition-transform [&_svg]:duration-200',
          isExpanded && '[&_svg]:-rotate-90',
        )}
      >
        {isExpanded ? 'Hide Details' : 'Open Details'}
      </AppButton>
    </div>
  );
};
