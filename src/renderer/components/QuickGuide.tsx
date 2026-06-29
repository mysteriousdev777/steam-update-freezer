import { useEffect, useRef, useState, type FC } from 'react';

import { CircleHelp, Info } from 'lucide-react';

import { cn } from '@/renderer/lib/cn';

import { AppButton } from './AppButton';

export const QuickGuide: FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={popoverRef}>
      <AppButton
        icon={CircleHelp}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'p-1.5 transition-colors [&_svg]:size-5',
          isOpen
            ? 'text-steam-text bg-white/10'
            : 'text-steam-muted hover:text-steam-text hover:bg-white/10',
        )}
        title="Quick Guide"
        aria-label="Open quick guide"
      />

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-md border border-steam-panel bg-steam-bar p-4 text-sm shadow-xl z-50 text-steam-text cursor-default">
          <h3 className="mb-3 font-semibold text-white">Quick Guide</h3>
          <ul className="flex flex-col gap-3">
            <li className="leading-relaxed">
              <span className="text-steam-muted mr-1.5">•</span>
              To stop Steam from updating a game — select it from the list and click{' '}
              <span className="font-semibold text-steam-ok">Block updates</span>.
            </li>
            <li className="leading-relaxed">
              <span className="text-steam-muted mr-1.5">•</span>
              When a patch comes out and Steam won't let the blocked game launch — click{' '}
              <span className="font-semibold text-update-start">Update manifest</span>.
            </li>
            <li className="leading-relaxed">
              <span className="text-steam-muted mr-1.5">•</span>
              If you want to allow Steam updates again — click{' '}
              <span className="font-semibold text-action-unfreeze">Unblock updates</span>.
            </li>
          </ul>
          <div className="mt-4 pt-3 border-t border-white/5 flex gap-2 text-steam-muted leading-relaxed">
            <Info className="size-4 shrink-0 mt-0.5 opacity-70" />
            <p>
              You can safely close this app after making changes. No background process is required.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
