import { type FC } from 'react';
import { FolderOpen, RotateCcw } from 'lucide-react';

import { cn } from '../lib/cn';
import { AppButton } from './AppButton';
import { useFolderPicker } from '../hooks/useFolderPicker';

type FolderFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onReset?: () => void;
  isResetting?: boolean;
  disabled?: boolean;
};

// Pick-only path field: read-only input (folders are chosen, not typed) + "Browse". An
// optional "Reset" button restores the registry-derived default (e.g. after a manual pick).
export const FolderField: FC<FolderFieldProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  onReset,
  isResetting = false,
  disabled = false,
}) => {
  const pickFolder = useFolderPicker();

  const browse = async () => {
    // Start at the current value, if any.
    const picked = await pickFolder(value || undefined);

    if (picked) onChange(picked);
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-steam-muted">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={value}
          placeholder={placeholder}
          readOnly
          disabled={disabled}
          className={cn(
            'flex-1 rounded border border-transparent bg-steam-bar px-3 py-2 outline-none',
            value ? 'text-steam-text' : 'text-steam-muted',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        />
        <AppButton
          icon={FolderOpen}
          disabled={disabled}
          onClick={() => void browse()}
          aria-label="Browse for folder"
          title="Browse for folder"
          className="border border-steam-panel px-3 py-2 text-steam-accent hover:border-steam-accent"
        >
          Browse
        </AppButton>
        {onReset && (
          <AppButton
            icon={RotateCcw}
            isBusy={isResetting}
            disabled={disabled}
            onClick={onReset}
            aria-label="Reset to registry default"
            title="Reset to registry default"
            className="border border-steam-panel px-3 py-2 text-steam-muted hover:border-steam-accent hover:text-steam-accent"
          >
            Reset
          </AppButton>
        )}
      </div>
    </div>
  );
};
