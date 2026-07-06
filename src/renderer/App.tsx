import { useCallback, useState, type FC } from 'react';

import { AlertCircle, Lock, LockOpen, RefreshCw } from 'lucide-react';
import { Toaster } from 'sonner';

import type { AppManifest } from '@/shared/types';

import { AppButton } from '@/renderer/components/AppButton';
import { GameSelect } from '@/renderer/components/GameSelect';
import { ManifestInfo } from '@/renderer/components/ManifestInfo';
import { SettingsScreen } from '@/renderer/components/settings/SettingsScreen';
import { TitleBar } from '@/renderer/components/TitleBar';

import { useBrowseAcf } from '@/renderer/hooks/useBrowseAcf';
import { useConfirmationSettings } from '@/renderer/hooks/useConfirmationSettings';
import { useInstalledGames } from '@/renderer/hooks/useInstalledGames';
import { useManifest } from '@/renderer/hooks/useManifest';
import { useManifestActions } from '@/renderer/hooks/useManifestActions';
import { useQuitGuard } from '@/renderer/hooks/useQuitGuard';
import { useSteamTarget } from '@/renderer/hooks/useSteamTarget';
import { useTelemetrySettings } from '@/renderer/hooks/useTelemetrySettings';
import { useTrackAppOpen } from '@/renderer/hooks/useTrackAppOpen';
import { useUpdateCheckSettings } from '@/renderer/hooks/useUpdateCheckSettings';

import { cn } from '@/renderer/lib/cn';

export const App: FC = () => {
  // Settings is a full-width swap within the same window
  const [view, setView] = useState<'main' | 'settings'>('main');

  // Quit guard reacts to the live `quit` toggle even while
  // the Settings view is open — App stays mounted across the view swap.
  const { confirmations, setConfirmation } = useConfirmationSettings();
  const { isTelemetryEnabled, setTelemetryEnabled } = useTelemetrySettings();
  const { isUpdateCheckEnabled, setUpdateCheckEnabled } = useUpdateCheckSettings();

  useTrackAppOpen();

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

  const { busyAction, canBlock, canUnblock, canUpdate, block, unblock, update } =
    useManifestActions({
      steamPath,
      appId,
      isManifestReadonly,
      isReading,
      applyWriteResult: handleWriteResult,
      confirmations,
    });

  useQuitGuard(isManifestReadonly === false, confirmations.quit);

  const isBusy = busyAction !== null;

  // Solid signal-colored action button; muted + not-allowed when disabled.
  const actionClass = (isEnabled: boolean, enabledColors: string) =>
    cn('px-4 py-2 font-semibold', isEnabled ? enabledColors : 'bg-steam-panel text-steam-muted');

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-steam-bg text-steam-text">
      <TitleBar
        onOpenSettings={() => setView('settings')}
        isUpdateCheckEnabled={isUpdateCheckEnabled}
      />
      {view === 'settings' ? (
        <SettingsScreen
          onBack={() => setView('main')}
          confirmations={confirmations}
          setConfirmation={setConfirmation}
          isTelemetryEnabled={isTelemetryEnabled}
          setTelemetryEnabled={setTelemetryEnabled}
          isUpdateCheckEnabled={isUpdateCheckEnabled}
          setUpdateCheckEnabled={setUpdateCheckEnabled}
        />
      ) : (
        <main className="flex-1 overflow-y-auto flex flex-col gap-4 p-6">
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

          <div className="flex flex-wrap items-center gap-2">
            <AppButton
              icon={Lock}
              isBusy={busyAction === 'lock'}
              onClick={() => void block()}
              disabled={!canBlock}
              className={actionClass(
                canBlock,
                'bg-gradient-to-r from-action-freeze-start to-action-freeze-end to-[60%] bg-[length:330%_100%] bg-[position:25%] hover:bg-[position:0%] text-white transition-all duration-200 ease-[ease]',
              )}
            >
              Block updates
            </AppButton>

            <AppButton
              icon={RefreshCw}
              isBusy={busyAction === 'update'}
              onClick={() => void update()}
              disabled={!canUpdate}
              className={actionClass(
                canUpdate,
                'bg-[length:200%_auto] bg-right bg-gradient-to-r from-action-update-start via-action-update-start via-50% to-action-update-end text-white transition-[background-position] duration-300 hover:bg-left',
              )}
            >
              Update manifest
            </AppButton>

            <div className="mx-8 h-8 w-px bg-white/10" />

            <AppButton
              icon={LockOpen}
              isBusy={busyAction === 'unlock'}
              onClick={() => void unblock()}
              disabled={!canUnblock}
              className={actionClass(
                canUnblock,
                'bg-action-unfreeze text-white transition-colors duration-200 hover:bg-action-unfreeze-hover',
              )}
            >
              Unblock updates
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
      )}
      <Toaster theme="dark" position="top-right" offset={{ top: 56 }} style={{ zIndex: 20 }} />
    </div>
  );
};
