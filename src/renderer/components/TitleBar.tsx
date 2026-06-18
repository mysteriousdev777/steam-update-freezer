import { type FC } from 'react';
import { Minus, X } from 'lucide-react';

export const TitleBar: FC = () => {
  return (
    <header className="bg-steam-bar px-4 py-2 text-sm font-semibold tracking-wide flex items-center justify-between [app-region:drag] select-none">
      <div>❄ Steam Update Freezer</div>
      <div className="flex items-center gap-1 [app-region:no-drag]">
        <button
          onClick={() => void window.freezer.minimizeWindow()}
          className="p-1 hover:bg-white/10 rounded transition-colors text-steam-muted hover:text-steam-text cursor-pointer"
          title="Minimize"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={() => void window.freezer.closeWindow()}
          className="p-1 hover:bg-red-500 rounded transition-colors text-steam-muted hover:text-white cursor-pointer"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>
    </header>
  );
};
