import { useEffect, useState, type FC } from 'react';
import { FileSearch, Lock, LockOpen, RefreshCw } from 'lucide-react';
import { Toaster } from 'sonner';
import { AppButton } from './components/AppButton';
import { FolderField } from './components/FolderField';
import { ManifestInfo } from './components/ManifestInfo';
import { TextField } from './components/TextField';
import { cn } from './lib/cn';
import { showErrorToast, showSuccessToast } from './lib/toast';
import { useDefaultSteamapps } from './hooks/useDefaultSteamapps';
import { useReadManifest } from './hooks/useReadManifest';
import { useSetManifestReadonly } from './hooks/useSetManifestReadonly';
import { useConfirm } from './hooks/useConfirm';
import { useUpdateManifest } from './hooks/useUpdateManifest';
import type { AppManifest } from '../shared/types';

export const App: FC = () => {
  const [steamPath, setSteamPath] = useState('');
  const [appId, setAppId] = useState('');

  const getDefaultSteamapps = useDefaultSteamapps();
  const readManifest = useReadManifest();
  const setManifestReadonly = useSetManifestReadonly();
  const updateManifest = useUpdateManifest();
  const confirmAction = useConfirm();

  const [manifest, setManifest] = useState<AppManifest | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [busyAction, setBusyAction] = useState<'lock' | 'unlock' | 'update' | null>(null);
  // Current read-only state of the manifest; null until known (after a read or a toggle).
  const [isManifestReadonly, setIsManifestReadonly] = useState<boolean | null>(null);

  // Pre-fill from the registry default on load, only while empty (never clobber a pick).
  useEffect(() => {
    let isCancelled = false;

    getDefaultSteamapps()
      .then(defaultPath => {
        if (isCancelled || !defaultPath) return;

        setSteamPath(prev => prev || defaultPath);
      })
      .catch(err => {
        console.error('[bridge] getDefaultSteamapps failed', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [getDefaultSteamapps]);

  // Changing the target invalidates what we knew about the previous manifest.
  useEffect(() => {
    setManifest(null);
    setIsManifestReadonly(null);
  }, [steamPath, appId]);

  const canRead = Boolean(steamPath && appId) && !isReading;

  const handleRead = async () => {
    setIsReading(true);
    try {
      const result = await readManifest(steamPath, appId);

      if (result.ok) {
        setManifest(result.manifest);
        setIsManifestReadonly(result.isReadonly);
      } else {
        setManifest(null);
        showErrorToast(result.error.message);
      }
    } catch (err) {
      showErrorToast(`Unexpected error: ${String(err)}`);
    } finally {
      setIsReading(false);
    }
  };

  const canWrite = Boolean(steamPath && appId) && busyAction === null;
  // Each toggle is offered only when it would actually change the current state.
  const canBlock = canWrite && isManifestReadonly === false;
  const canUnblock = canWrite && isManifestReadonly === true;

  const handleSetReadonly = async (isReadonly: boolean) => {
    // Unblocking lets Steam update the game again (drops the freeze) — confirm first.
    if (!isReadonly) {
      const isConfirmed = await confirmAction({
        message: 'Unblock game update?',
        detail: 'Steam will be allowed to update this game again, removing the freeze.',
      });

      if (!isConfirmed) return;
    }

    setBusyAction(isReadonly ? 'lock' : 'unlock');
    try {
      const result = await setManifestReadonly(steamPath, appId, isReadonly);

      if (result.ok) {
        setIsManifestReadonly(result.isReadonly);
        showSuccessToast(`Game updates are now ${result.isReadonly ? 'blocked' : 'unblocked'}.`);
      } else {
        showErrorToast(result.error.message);
      }
    } catch (err) {
      showErrorToast(`Unexpected error: ${String(err)}`);
    } finally {
      setBusyAction(null);
    }
  };

  const handleUpdate = async () => {
    const isConfirmed = await confirmAction({
      message: 'Update manifest to the current public build?',
      detail:
        'Rewrites the .acf and locks it read-only (a .acf.bak backup is made first). Steam must be closed.',
    });

    if (!isConfirmed) return;

    setBusyAction('update');
    try {
      const result = await updateManifest(steamPath, appId);

      if (result.ok) {
        setManifest(result.manifest);
        setIsManifestReadonly(result.isReadonly);
        showSuccessToast(`Manifest updated to build ${result.manifest.buildId} — updates blocked.`);
      } else {
        showErrorToast(result.error.message);
      }
    } catch (err) {
      showErrorToast(`Unexpected error: ${String(err)}`);
    } finally {
      setBusyAction(null);
    }
  };

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
          onChange={setSteamPath}
          placeholder="Select your Steam library folder…"
        />

        <TextField
          id="app-id"
          label="App ID"
          value={appId}
          onChange={setAppId}
          placeholder="Enter App ID"
          inputMode="numeric"
        />

        <div className="flex flex-wrap gap-2">
          <AppButton
            icon={FileSearch}
            isBusy={isReading}
            onClick={() => void handleRead()}
            disabled={!canRead}
            className={actionClass(canRead, 'bg-steam-accent text-steam-bg hover:brightness-110')}
          >
            {isReading ? 'Reading…' : 'Read manifest'}
          </AppButton>
          <AppButton
            icon={Lock}
            isBusy={busyAction === 'lock'}
            onClick={() => void handleSetReadonly(true)}
            disabled={!canBlock}
            className={actionClass(canBlock, 'bg-block text-white hover:brightness-110')}
          >
            Block game update
          </AppButton>
          <AppButton
            icon={LockOpen}
            isBusy={busyAction === 'unlock'}
            onClick={() => void handleSetReadonly(false)}
            disabled={!canUnblock}
            className={actionClass(canUnblock, 'bg-unblock text-white hover:brightness-110')}
          >
            Unblock game update
          </AppButton>
          <AppButton
            icon={RefreshCw}
            isBusy={busyAction === 'update'}
            onClick={() => void handleUpdate()}
            disabled={!canWrite}
            className={actionClass(canWrite, 'bg-steam-accent text-steam-bg hover:brightness-110')}
          >
            Update manifest
          </AppButton>
        </div>

        {isManifestReadonly !== null && (
          <p className="text-sm">
            Game updates:{' '}
            <span className={isManifestReadonly ? 'text-steam-ok' : 'text-steam-warn'}>
              {isManifestReadonly ? 'blocked 🔒' : 'allowed 🔓'}
            </span>
          </p>
        )}

        {manifest && <ManifestInfo manifest={manifest} />}
      </main>
      <Toaster theme="dark" richColors position="top-right" />
    </div>
  );
};
