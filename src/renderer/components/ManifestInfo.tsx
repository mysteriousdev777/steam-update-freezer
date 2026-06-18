import { useState, type FC } from 'react';
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

  return (
    <div className="flex flex-col rounded bg-steam-panel">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-xl font-semibold">{manifest.name || '(unnamed app)'}</span>
          <span className="text-xs text-steam-muted">App ID: {manifest.appId || '—'}</span>
        </div>
        {isReadonly !== null && (
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <span className="text-xs text-steam-muted">Update status</span>
            <span
              className={cn('text-xl font-bold', isReadonly ? 'text-steam-ok' : 'text-steam-warn')}
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
          className="shrink-0 border border-steam-panel p-2 text-steam-accent hover:border-steam-accent"
        />
      </div>

      <AppButton
        icon={ChevronRight}
        onClick={() => setIsExpanded(prev => !prev)}
        className={cn(
          'border-t border-white/10 px-4 py-2 text-xs text-steam-muted hover:text-steam-text',
          '[&_svg]:transition-transform [&_svg]:duration-200',
          isExpanded && '[&_svg]:rotate-90',
        )}
      >
        Details
      </AppButton>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-in-out',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-4 border-t border-white/10 px-4 py-3 text-sm">
            <div className="grid grid-cols-[7rem_1fr] gap-y-1">
              <span className="text-steam-label">Build ID</span>
              <span className="font-mono">{manifest.buildId || '—'}</span>
              <span className="text-steam-label">State flags</span>
              <span className="font-mono">{manifest.stateFlags || '—'}</span>
            </div>

            <div>
              <div className="mb-1 text-steam-label">Installed depots</div>
              {manifest.installedDepots.length === 0 ? (
                <div>(none)</div>
              ) : (
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="text-left text-steam-label">
                      <th className="w-28 border-b border-white/20 py-1 pr-6 font-medium">Depot</th>
                      <th className="border-b border-white/20 py-1 font-medium">Manifest</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 font-mono">
                    {manifest.installedDepots.map(depot => (
                      <tr key={depot.depotId}>
                        <td className="w-28 py-1 pr-6">{depot.depotId}</td>
                        <td className="py-1">{depot.manifest}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
