import { useCallback, type FC } from 'react';
import { AlertCircle, Lock, LockOpen, RefreshCw } from 'lucide-react';
import { Toaster } from 'sonner';
import type { AppManifest } from '../shared/types';
import { TitleBar } from './components/TitleBar';
import { AppButton } from './components/AppButton';
import { GameSelect } from './components/GameSelect';
import { ManifestInfo } from './components/ManifestInfo';
import { cn } from './lib/cn';
import { useSteamTarget } from './hooks/useSteamTarget';
import { useInstalledGames } from './hooks/useInstalledGames';
import { useManifest } from './hooks/useManifest';
import { useManifestActions } from './hooks/useManifestActions';
import { useQuitGuard } from './hooks/useQuitGuard';
import { useBrowseAcf } from './hooks/useBrowseAcf';

export const App: FC = () => {
  const {
    games,
    skipped,
    isLoading,
    error: gamesError,
    rescan,
    markGameReadonly,
  } = useInstalledGames();
  const { steamPath, appId, target, selectGame, selectManual, readCurrent } = useSteamTarget(games);
  const browseAcf = useBrowseAcf(selectManual);

  const { manifest, isReading, readError, isManifestReadonly, applyWriteResult } = useManifest(
    steamPath,
    appId,
    target,
  );

  // The current target's title from the freshly read manifest — the picker shows it for a manual
  // pick (one the scan doesn't list). Guard on appId so a stale manifest from the previous target
  // isn't shown for the new one.
  const manifestName = manifest && manifest.appId === appId ? manifest.name : '';

  // After a write, update the picker row's frozen flag alongside the manifest read state.
  const handleWriteResult = useCallback(
    (result: { manifest?: AppManifest; isReadonly: boolean }) => {
      applyWriteResult(result);
      markGameReadonly(appId, result.isReadonly);
    },
    [applyWriteResult, markGameReadonly, appId],
  );

  const { busyAction, canWrite, canBlock, canUnblock, setReadonly, update } = useManifestActions({
    steamPath,
    appId,
    isManifestReadonly,
    applyWriteResult: handleWriteResult,
  });

  useQuitGuard(isManifestReadonly === false);

  const isBusy = busyAction !== null;

  // Solid signal-colored action button; muted + not-allowed when disabled.
  const actionClass = (isEnabled: boolean, enabledColors: string) =>
    cn('px-4 py-2 font-semibold', isEnabled ? enabledColors : 'bg-steam-panel text-steam-muted');

  return (
    <div className="min-h-screen bg-steam-bg text-steam-text">
      <TitleBar />
      <main className="flex flex-col gap-4 p-6">
        <h1 className="text-xl font-bold">Steam Update Freezer</h1>

        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <GameSelect
              games={games}
              selectedAppId={appId}
              manualName={manifestName}
              onSelect={selectGame}
              onBrowseAcf={() => void browseAcf()}
              disabled={isBusy}
              isLoading={isLoading}
            />
          </div>
          <AppButton
            icon={RefreshCw}
            isBusy={isLoading}
            disabled={isBusy}
            onClick={rescan}
            aria-label="Rescan installed games"
            title="Rescan installed games"
            className="border border-steam-panel px-3 py-2 text-steam-accent hover:border-steam-accent"
          >
            Rescan
          </AppButton>
        </div>

        {gamesError && (
          <div className="flex items-center gap-2 text-sm text-steam-warn">
            <AlertCircle className="size-4 shrink-0" />
            <span>{gamesError}</span>
          </div>
        )}

        {skipped > 0 && (
          <div className="flex items-center gap-2 text-sm text-steam-warn">
            <AlertCircle className="size-4 shrink-0" />
            <span>
              Couldn't read {skipped} game manifest(s) — some games may be missing from the list
              (locked or no access). Try Rescan.
            </span>
          </div>
        )}

        {readError && (
          <div className="flex items-center gap-2 text-sm text-steam-warn">
            <AlertCircle className="size-4 shrink-0" />
            <span>{readError}</span>
            <AppButton
              icon={RefreshCw}
              isBusy={isReading}
              onClick={readCurrent}
              className="border border-steam-panel px-2 py-1 text-xs text-steam-muted hover:border-steam-accent hover:text-steam-accent"
            >
              Retry
            </AppButton>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <AppButton
            icon={Lock}
            isBusy={busyAction === 'lock'}
            onClick={() => void setReadonly(true)}
            disabled={!canBlock}
            className={actionClass(canBlock, 'bg-block text-white hover:brightness-110')}
          >
            Block game update
          </AppButton>
          <AppButton
            icon={LockOpen}
            isBusy={busyAction === 'unlock'}
            onClick={() => void setReadonly(false)}
            disabled={!canUnblock}
            className={actionClass(canUnblock, 'bg-unblock text-white hover:brightness-110')}
          >
            Unblock game update
          </AppButton>
          <AppButton
            icon={RefreshCw}
            isBusy={busyAction === 'update'}
            onClick={() => void update()}
            disabled={!canWrite}
            className={actionClass(canWrite, 'bg-steam-accent text-steam-bg hover:brightness-110')}
          >
            Update manifest
          </AppButton>
        </div>

        {manifest && (
          <ManifestInfo
            manifest={manifest}
            isReadonly={isManifestReadonly}
            onRefresh={readCurrent}
            isRefreshing={isReading}
          />
        )}
      </main>
      <Toaster theme="dark" richColors position="top-right" />
    </div>
  );
};
