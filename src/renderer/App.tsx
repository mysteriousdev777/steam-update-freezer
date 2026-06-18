import { type FC } from 'react';
import { Lock, LockOpen, RefreshCw } from 'lucide-react';
import { Toaster } from 'sonner';
import { AppButton } from './components/AppButton';
import { FolderField } from './components/FolderField';
import { ManifestInfo } from './components/ManifestInfo';
import { TextField } from './components/TextField';
import { cn } from './lib/cn';
import { useSteamTarget } from './hooks/useSteamTarget';
import { useManifest } from './hooks/useManifest';
import { useManifestActions } from './hooks/useManifestActions';
import { useQuitGuard } from './hooks/useQuitGuard';

export const App: FC = () => {
  const {
    steamPath,
    appId,
    target,
    setAppId,
    readCurrent,
    changeSteamPath,
    resetSteamPath,
    isResettingSteamPath,
  } = useSteamTarget();

  const { manifest, isReading, readError, isManifestReadonly, applyWriteResult } = useManifest(
    steamPath,
    appId,
    target,
  );

  const { busyAction, canWrite, canBlock, canUnblock, setReadonly, update } = useManifestActions({
    steamPath,
    appId,
    isManifestReadonly,
    applyWriteResult,
  });

  useQuitGuard(isManifestReadonly === false);

  // Solid signal-colored action button; muted + not-allowed when disabled.
  const actionClass = (isEnabled: boolean, enabledColors: string) =>
    cn('px-4 py-2 font-semibold', isEnabled ? enabledColors : 'bg-steam-panel text-steam-muted');

  return (
    <div className="min-h-screen bg-steam-bg text-steam-text">
      <header className="bg-steam-bar px-4 py-2 text-sm font-semibold tracking-wide">
        ❄ UPDATE FREEZER
      </header>
      <main className="flex flex-col gap-4 p-6">
        <h1 className="text-xl font-bold">Steam Update Freezer</h1>

        <FolderField
          id="steam-path"
          label="Steam library folder"
          value={steamPath}
          onChange={changeSteamPath}
          placeholder="Select your Steam library folder…"
          onReset={() => void resetSteamPath()}
          isResetting={isResettingSteamPath}
          disabled={busyAction !== null}
        />

        <TextField
          id="app-id"
          label="App ID"
          value={appId}
          onChange={setAppId}
          placeholder="Enter App ID"
          inputMode="numeric"
          onConfirm={readCurrent}
          readError={readError}
          isLoading={isReading}
          disabled={busyAction !== null}
        />

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
