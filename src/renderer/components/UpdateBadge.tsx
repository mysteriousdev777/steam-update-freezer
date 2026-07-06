import { useRef, useState, type FC } from 'react';

import { Download } from 'lucide-react';

import { AppButton } from '@/renderer/components/AppButton';

import { useOutsideClick } from '@/renderer/hooks/useOutsideClick';
import { useUpdateCheck } from '@/renderer/hooks/useUpdateCheck';

import { cn } from '@/renderer/lib/cn';

type UpdateBadgeProps = {
  isEnabled: boolean;
};

export const UpdateBadge: FC<UpdateBadgeProps> = ({ isEnabled }) => {
  const updateInfo = useUpdateCheck(isEnabled);
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useOutsideClick(popoverRef, isOpen, () => setIsOpen(false));

  if (!updateInfo.hasUpdate) {
    return null;
  }

  return (
    <div className="relative" ref={popoverRef}>
      <AppButton
        icon={Download}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'p-1.5 transition-colors [&_svg]:size-5',
          isOpen
            ? 'text-steam-text bg-white/10'
            : 'text-steam-muted hover:text-steam-text hover:bg-white/10',
        )}
        title="Update available"
        aria-label="View update details"
      />

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-md border border-steam-panel bg-steam-bar p-4 text-sm shadow-xl z-50 text-steam-text cursor-default">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Update available</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80 font-medium tracking-wide">
              v{updateInfo.latestVersion}
            </span>
          </div>

          <div className="mb-4">
            <p className="text-steam-muted leading-relaxed">
              A new version of Steam Update Freezer is available.
            </p>
          </div>

          <AppButton
            icon={Download}
            onClick={() => {
              if (updateInfo.htmlUrl) {
                void window.freezer.openExternal(updateInfo.htmlUrl);
              }

              setIsOpen(false);
            }}
            className={cn(
              'w-full justify-center py-2 px-4 rounded-md font-semibold',
              'bg-steam-ok text-white transition hover:brightness-110',
            )}
          >
            Download Update
          </AppButton>
        </div>
      )}
    </div>
  );
};
