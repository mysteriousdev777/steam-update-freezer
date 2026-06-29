import { type FC } from 'react';

import { cn } from '@/renderer/lib/cn';

type AppSwitchProps = {
  isChecked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
};

export const AppSwitch: FC<AppSwitchProps> = ({
  isChecked,
  onCheckedChange,
  disabled = false,
  className,
  ...rest
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={isChecked}
    disabled={disabled}
    onClick={() => onCheckedChange(!isChecked)}
    className={cn(
      'relative h-5 w-9 shrink-0 rounded-full transition-colors',
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      isChecked ? 'bg-steam-accent' : 'bg-steam-panel',
      className,
    )}
    {...rest}
  >
    <span
      className={cn(
        'absolute top-0.5 left-0.5 size-4 rounded-full bg-white transition-transform',
        isChecked && 'translate-x-4',
      )}
    />
  </button>
);
