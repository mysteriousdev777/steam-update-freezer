import { type FC } from 'react';
import { FolderOpen } from 'lucide-react';

import { cn } from '../lib/cn';
import { AppButton } from './AppButton';
import { useFolderPicker } from '../hooks/useFolderPicker';

type FolderFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

// Pick-only path field: read-only input (folders are chosen, not typed) + "Browse".
export const FolderField: FC<FolderFieldProps> = ({ id, label, value, onChange, placeholder }) => {
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
          className={cn(
            'flex-1 rounded border border-transparent bg-steam-bar px-3 py-2 outline-none',
            value ? 'text-steam-text' : 'text-steam-muted',
          )}
        />
        <AppButton
          icon={FolderOpen}
          onClick={() => void browse()}
          aria-label="Browse for folder"
          title="Browse for folder"
          className="border border-steam-panel px-3 py-2 text-steam-accent hover:border-steam-accent"
        >
          Browse
        </AppButton>
      </div>
    </div>
  );
};
