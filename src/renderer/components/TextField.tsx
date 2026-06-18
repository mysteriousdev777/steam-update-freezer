import { useState, type FC } from 'react';
import { AlertCircle, Check, Pencil, RefreshCw, RotateCcw } from 'lucide-react';

import { cn } from '../lib/cn';
import { AppButton } from './AppButton';

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: 'text' | 'numeric';
  onConfirm?: () => void;
  readError?: string | null;
  isLoading?: boolean;
  disabled?: boolean;
};

export const TextField: FC<TextFieldProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  inputMode = 'text',
  onConfirm,
  readError,
  isLoading = false,
  disabled = false,
}) => {
  // A field with a value starts locked; the pencil/check button toggles editing.
  const [isEditing, setIsEditing] = useState(false);
  // The value when editing began — what "reset" restores.
  const [editBaseline, setEditBaseline] = useState(value);

  const startEditing = () => {
    setEditBaseline(value);
    setIsEditing(true);
  };

  const finishEditing = () => {
    setIsEditing(false);
    onConfirm?.();
  };

  const reset = () => onChange(editBaseline);

  const isDirty = value !== editBaseline;
  const showError = Boolean(readError) && !isEditing;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-steam-muted">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          inputMode={inputMode}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={!isEditing}
          disabled={disabled}
          className={cn(
            'flex-1 rounded border px-3 py-2 outline-none',
            isEditing
              ? 'border-steam-panel bg-steam-bar text-steam-text focus:border-steam-accent'
              : 'border-transparent bg-steam-bar text-steam-muted',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        />
        {isEditing && isDirty && (
          <AppButton
            icon={RotateCcw}
            onClick={reset}
            disabled={disabled}
            aria-label="Reset changes"
            title="Reset changes"
            className="border border-steam-panel p-2 text-steam-muted hover:border-steam-accent hover:text-steam-accent"
          />
        )}
        <AppButton
          icon={isEditing ? Check : Pencil}
          isBusy={!isEditing && isLoading}
          disabled={disabled || isLoading}
          onClick={isEditing ? finishEditing : startEditing}
          aria-label={isEditing ? 'Done' : 'Edit'}
          title={isEditing ? 'Done' : 'Edit'}
          className="border border-steam-panel p-2 text-steam-accent hover:border-steam-accent"
        />
      </div>
      {showError && (
        <div className="flex items-center gap-2 text-sm text-steam-warn">
          <AlertCircle className="size-4 shrink-0" />
          <span>{readError}</span>
          <AppButton
            icon={RefreshCw}
            isBusy={isLoading}
            disabled={disabled}
            onClick={() => onConfirm?.()}
            className="border border-steam-panel px-2 py-1 text-xs text-steam-muted hover:border-steam-accent hover:text-steam-accent"
          >
            Retry
          </AppButton>
        </div>
      )}
    </div>
  );
};
