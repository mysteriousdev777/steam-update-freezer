import { useState, type FC } from 'react';

import { ArrowLeft, Info, Settings } from 'lucide-react';

import type { ConfirmationKey, ConfirmationSettings } from '@/shared/types';

import { AppButton } from '@/renderer/components/AppButton';
import { AboutTab } from '@/renderer/components/settings/AboutTab';
import { SettingsTab } from '@/renderer/components/settings/SettingsTab';

import { cn } from '@/renderer/lib/cn';

type SettingsScreenProps = {
  onBack: () => void;
  confirmations: ConfirmationSettings;
  setConfirmation: (key: ConfirmationKey, isEnabled: boolean) => void;
  isTelemetryEnabled: boolean;
  setTelemetryEnabled: (isEnabled: boolean) => void;
};

type SettingsTabKey = 'settings' | 'about';

const TABS: { key: SettingsTabKey; label: string; icon: typeof Settings }[] = [
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'about', label: 'About', icon: Info },
];

// Tab content is navigation-agnostic (SettingsTab/AboutTab) — this left sidebar (Steam
// Settings-style) can later grow more entries without touching the section content.
export const SettingsScreen: FC<SettingsScreenProps> = ({
  onBack,
  confirmations,
  setConfirmation,
  isTelemetryEnabled,
  setTelemetryEnabled,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>('settings');
  const activeLabel = TABS.find(tab => tab.key === activeTab)?.label ?? '';

  return (
    <div className="flex flex-1 overflow-hidden">
      <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-white/5 bg-black/20 p-3">
        <div className="flex items-center gap-2 px-1 pb-4">
          <AppButton
            icon={ArrowLeft}
            onClick={onBack}
            aria-label="Back"
            title="Back"
            className="p-1.5 text-steam-muted hover:bg-white/10 hover:text-steam-text"
          />
          <span className="text-xs font-bold uppercase tracking-wider text-steam-accent">
            Settings
          </span>
        </div>

        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-left text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-white/10 text-white'
                : 'text-steam-muted hover:bg-white/5 hover:text-steam-text',
            )}
          >
            <tab.icon className="size-4 shrink-0" />
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="mb-6 text-xl font-bold">{activeLabel}</h1>
        {activeTab === 'settings' ? (
          <SettingsTab
            confirmations={confirmations}
            setConfirmation={setConfirmation}
            isTelemetryEnabled={isTelemetryEnabled}
            setTelemetryEnabled={setTelemetryEnabled}
          />
        ) : (
          <AboutTab />
        )}
      </div>
    </div>
  );
};
