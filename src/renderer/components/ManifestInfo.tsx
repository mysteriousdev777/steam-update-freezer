import { type FC } from 'react';

import type { AppManifest } from '../../shared/types';

type ManifestInfoProps = {
  manifest: AppManifest;
};

// Renders a read manifest as neat tables. Success only — read errors surface as toasts.
export const ManifestInfo: FC<ManifestInfoProps> = ({ manifest }) => (
  <div className="flex flex-col gap-4 rounded bg-steam-panel p-4">
    <div className="text-lg font-semibold">{manifest.name || '(unnamed app)'}</div>

    <table className="border-collapse text-sm">
      <tbody>
        <tr>
          <td className="py-0.5 pr-6 text-steam-muted">App ID</td>
          <td className="py-0.5 font-mono">{manifest.appId || '—'}</td>
        </tr>
        <tr>
          <td className="py-0.5 pr-6 text-steam-muted">Build ID</td>
          <td className="py-0.5 font-mono">{manifest.buildId || '—'}</td>
        </tr>
        <tr>
          <td className="py-0.5 pr-6 text-steam-muted">State flags</td>
          <td className="py-0.5 font-mono">{manifest.stateFlags || '—'}</td>
        </tr>
      </tbody>
    </table>

    <div className="text-sm">
      <div className="mb-1 text-steam-muted">Installed depots</div>
      {manifest.installedDepots.length === 0 ? (
        <div>(none)</div>
      ) : (
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="text-left text-steam-muted">
              <th className="border-b border-white/20 py-1 pr-6 font-medium">Depot</th>
              <th className="border-b border-white/20 py-1 font-medium">Manifest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 font-mono">
            {manifest.installedDepots.map(depot => (
              <tr key={depot.depotId}>
                <td className="py-1 pr-6">{depot.depotId}</td>
                <td className="py-1">{depot.manifest}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);
