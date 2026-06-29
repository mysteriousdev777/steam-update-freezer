import { type FC } from 'react';

import { ExternalLink, RotateCcw } from 'lucide-react';

import type { ConfirmationKey, ConfirmationSettings } from '@/shared/types';

import { AppButton } from '@/renderer/components/AppButton';
import { AppSwitch } from '@/renderer/components/AppSwitch';

import { useOpenExternal } from '@/renderer/hooks/useOpenExternal';
import { useRestoreDefaultWindowSize } from '@/renderer/hooks/useRestoreDefaultWindowSize';

import { PRIVACY_URL } from '@/renderer/lib/links';

type SettingsTabProps = {
  confirmations: ConfirmationSettings;
  setConfirmation: (key: ConfirmationKey, isEnabled: boolean) => void;
  isTelemetryEnabled: boolean;
  setTelemetryEnabled: (isEnabled: boolean) => void;
};

// The toggles persist in localStorage (via App) and gate each action's confirm dialog:
// block/update/unblock in useManifestActions, quit in the quit guard.
const CONFIRM_TOGGLES: { key: ConfirmationKey; label: string }[] = [
  { key: 'block', label: 'Ask before blocking updates' },
  { key: 'update', label: 'Ask before updating the manifest' },
  { key: 'unblock', label: 'Ask before unblocking updates' },
  { key: 'quit', label: 'Ask before quitting with updates unblocked' },
];

const SectionHeading: FC<{ children: string; description?: string }> = ({
  children,
  description,
}) => (
  <div className="flex flex-col gap-1">
    <h2 className="text-xs font-medium uppercase tracking-wider text-steam-label">{children}</h2>
    {description && <p className="text-xs text-steam-muted">{description}</p>}
  </div>
);

export const SettingsTab: FC<SettingsTabProps> = ({
  confirmations,
  setConfirmation,
  isTelemetryEnabled,
  setTelemetryEnabled,
}) => {
  const { restoreDefaultWindowSize, isBusy } = useRestoreDefaultWindowSize();
  const openExternal = useOpenExternal();

  return (
    <div className="flex max-w-xl flex-col gap-8">
      <section className="flex flex-col gap-3">
        <SectionHeading description="Show a confirmation dialog before these actions.">
          Confirmations
        </SectionHeading>
        <div className="flex flex-col divide-y divide-white/5 rounded border border-white/5 bg-black/20 px-4">
          {CONFIRM_TOGGLES.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-4 py-3">
              <span className="text-sm text-steam-text">{label}</span>
              <AppSwitch
                isChecked={confirmations[key]}
                onCheckedChange={next => setConfirmation(key, next)}
                aria-label={label}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading>Window</SectionHeading>
        <div className="flex">
          <AppButton
            icon={RotateCcw}
            isBusy={isBusy}
            onClick={() => void restoreDefaultWindowSize()}
            className="border border-white/10 bg-black/20 px-4 py-2 text-sm text-steam-text hover:border-steam-accent hover:text-steam-accent"
          >
            Restore default window
          </AppButton>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading description="Strictly anonymous usage analytics, so I can tell the app is working. No accounts, files, or personal info, ever.">
          Privacy & Analytics
        </SectionHeading>
        <div className="flex flex-col divide-y divide-white/5 rounded border border-white/5 bg-black/20 px-4">
          <div className="flex items-center justify-between gap-4 py-3">
            <span className="text-sm text-steam-text">Help improve the app with anonymous analytics</span>
            <AppSwitch
              isChecked={isTelemetryEnabled}
              onCheckedChange={setTelemetryEnabled}
              aria-label="Help improve the app with anonymous analytics"
            />
          </div>
        </div>
        <AppButton
          icon={ExternalLink}
          onClick={() => void openExternal(PRIVACY_URL)}
          className="self-start px-1 text-xs text-steam-muted hover:text-steam-accent"
        >
          Read the privacy policy
        </AppButton>
      </section>
    </div>
  );
};
