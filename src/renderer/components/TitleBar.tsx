import { type FC } from 'react';

import { Minus, Settings, Snowflake, X } from 'lucide-react';

import { AppButton } from '@/renderer/components/AppButton';
import { QuickGuide } from '@/renderer/components/QuickGuide';

type TitleBarProps = {
  onOpenSettings: () => void;
};

export const TitleBar: FC<TitleBarProps> = ({ onOpenSettings }) => {
  return (
    <header className="relative z-30 bg-steam-bar px-4 py-2 text-sm font-semibold tracking-wide flex items-center justify-between [app-region:drag] select-none">
      <div className="flex items-center gap-2">
        <Snowflake className="size-[18px] text-steam-muted" />
        <span className="text-white/80">Steam Update Freezer</span>
      </div>
      <div className="flex items-center gap-1 [app-region:no-drag]">
        <QuickGuide />
        <AppButton
          icon={Settings}
          onClick={onOpenSettings}
          className="p-1.5 hover:bg-white/10 transition-colors text-steam-muted hover:text-steam-text [&_svg]:size-5"
          title="Settings"
          aria-label="Open settings"
        />
        <div className="mx-1 h-4 w-px bg-white/10" />
        <AppButton
          icon={Minus}
          onClick={() => void window.freezer.minimizeWindow()}
          className="p-1.5 hover:bg-white/10 transition-colors text-steam-muted hover:text-steam-text [&_svg]:size-5"
          title="Minimize"
        />
        <AppButton
          icon={X}
          onClick={() => void window.freezer.closeWindow()}
          className="p-1.5 hover:bg-red-500 transition-colors text-steam-muted hover:text-white [&_svg]:size-5"
          title="Close"
        />
      </div>
    </header>
  );
};
