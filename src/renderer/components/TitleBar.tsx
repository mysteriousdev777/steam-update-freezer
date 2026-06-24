import { type FC } from 'react';
import { Minus, X } from 'lucide-react';

import { AppButton } from './AppButton';

export const TitleBar: FC = () => {
  return (
    <header className="bg-steam-bar px-4 py-2 text-sm font-semibold tracking-wide flex items-center justify-between [app-region:drag] select-none">
      <div>❄ Steam Update Freezer</div>
      <div className="flex items-center gap-1 [app-region:no-drag]">
        <AppButton
          icon={Minus}
          onClick={() => void window.freezer.minimizeWindow()}
          className="p-1 hover:bg-white/10 transition-colors text-steam-muted hover:text-steam-text"
          title="Minimize"
        />
        <AppButton
          icon={X}
          onClick={() => void window.freezer.closeWindow()}
          className="p-1 hover:bg-red-500 transition-colors text-steam-muted hover:text-white"
          title="Close"
        />
      </div>
    </header>
  );
};
