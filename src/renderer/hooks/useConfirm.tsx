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
import { Check, X, AlertTriangle } from 'lucide-react';

import type { ConfirmOptions } from '../../shared/types';
import { AppButton } from '../components/AppButton';
import { cn } from '../lib/cn';

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
          <div className="w-full max-w-md rounded bg-steam-panel p-6 shadow-xl border border-steam-bar">
            <h2
              className={cn(
                'mb-2 text-xl font-bold flex items-center gap-2',
                isDanger ? 'text-steam-dislike' : 'text-steam-text',
              )}
            >
              {isDanger && <AlertTriangle className="size-6" />}
              {options.message}
            </h2>
            {options.detail && <p className="text-steam-label">{options.detail}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <AppButton
                icon={X}
                onClick={handleCancel}
                className="bg-steam-bg px-4 py-2 font-semibold text-steam-text hover:brightness-110"
              >
                {options.cancelLabel || 'Cancel'}
              </AppButton>
              <AppButton
                icon={Check}
                onClick={handleConfirm}
                className={cn(
                  'px-4 py-2 font-semibold hover:brightness-110',
                  isDanger ? 'bg-steam-dislike text-white' : 'bg-steam-accent text-steam-bg',
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
