import { type FC } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/cn';
import appIcon from '../../../assets/metal_gamer_snowflake.png';

type SteamToastProps = {
  message: string;
  type: 'success' | 'error';
};

export const SteamToast: FC<SteamToastProps> = ({ message, type }) => {
  return (
    <div
      className={cn(
        'relative flex w-90 overflow-hidden rounded-sm border-y border-r border-l-4 border-white/10 bg-steam-bar p-3 shadow-2xl',
        type === 'success' ? 'border-l-steam-ok' : 'border-l-steam-warn',
      )}
    >
      <img
        src={appIcon}
        alt=""
        className="absolute -bottom-4 -right-4 h-28 w-28 opacity-5 grayscale"
      />

      <div className="z-10 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/10 bg-black/50">
          <img src={appIcon} alt="App Icon" className="h-full w-full object-cover" />
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-xs text-steam-label">
            {type === 'success' ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-steam-ok" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-steam-warn" />
            )}
            {type === 'success' ? 'Success' : 'Failed'}
          </div>
          <div className="font-semibold text-white">{message}</div>
        </div>
      </div>
    </div>
  );
};
