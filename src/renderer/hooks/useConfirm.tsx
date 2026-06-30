import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from 'react';

import { AlertTriangle, Info } from 'lucide-react';

import type { ConfirmOptions } from '@/shared/types';

import { AppButton } from '@/renderer/components/AppButton';

import { cn } from '@/renderer/lib/cn';

type ConfirmContextType = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextType | null>(null);

/**
 * Provider that manages the state of the custom React confirmation dialog.
 */
export const ConfirmProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  // Ref, not state — keeps `confirm` referentially stable across renders.
  const resolverRef = useRef<((value: boolean) => void) | undefined>(undefined);

  const confirm = useCallback((opts: ConfirmOptions) => {
    // Resolve any still-pending dialog as cancelled before replacing it, so a dialog opened over
    // another (e.g. a quit request while an action confirm is up) never leaves a dangling promise.
    resolverRef.current?.(false);

    setOptions(opts);
    setIsOpen(true);

    return new Promise<boolean>(resolve => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleConfirm = () => {
    resolverRef.current?.(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    resolverRef.current?.(false);
    setIsOpen(false);
  };

  // Memoized so the context value stays referentially stable.
  const contextValue = useMemo(() => ({ confirm }), [confirm]);

  const isDanger = options?.variant === 'danger';

  return (
    <ConfirmContext.Provider value={contextValue}>
      {children}

      {isOpen && options && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[3px] bg-steam-panel shadow-2xl border border-white/10">
            <div className="p-6">
              <h2
                className={cn(
                  'mb-3 text-xl font-bold flex items-center gap-3',
                  isDanger ? 'text-action-unfreeze' : 'text-white',
                )}
              >
                {isDanger && <AlertTriangle className="size-6" />}
                {options.message}
              </h2>
              {options.detail && (
                <p className="text-base text-steam-text leading-relaxed">{options.detail}</p>
              )}
              {options.note && (
                <div className="mt-4 flex gap-2.5 rounded-[2px] border border-steam-accent/20 bg-steam-accent/5 px-3 py-2.5">
                  <Info className="mt-0.5 size-4 shrink-0 text-steam-accent" />
                  <p className="text-sm text-steam-label leading-relaxed">{options.note}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 pt-0">
              <AppButton
                onClick={handleCancel}
                className="bg-white/5 px-5 py-2.5 text-[14px] font-medium text-steam-text hover:bg-white/10 hover:text-white transition-colors rounded-[2px] border border-white/10"
              >
                {options.cancelLabel || 'Cancel'}
              </AppButton>
              <AppButton
                onClick={handleConfirm}
                className={cn(
                  'px-6 py-2.5 text-[14px] font-medium text-white transition-all rounded-[2px]',
                  isDanger
                    ? 'bg-action-unfreeze hover:brightness-110'
                    : 'bg-steam-ok hover:brightness-110',
                )}
              >
                {options.confirmLabel || 'Confirm'}
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

/**
 * Returns a stable callback resolving to true when the user confirms.
 */
export const useConfirm = () => {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }

  return context.confirm;
};
