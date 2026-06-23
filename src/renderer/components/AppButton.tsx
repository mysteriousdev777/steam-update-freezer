import { type ButtonHTMLAttributes, type FC } from 'react';
import { LoaderCircle, type LucideIcon } from 'lucide-react';

import { cn } from '../lib/cn';

type AppButtonProps = {
  // Every button usually carries an icon; icon-only buttons omit children.
  icon?: LucideIcon;
  // When true, the icon becomes a spinner and the button is disabled.
  isBusy?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

// Shared button base: lucide icon (size-4), cursor-pointer when enabled / not-allowed when
// disabled, optional busy spinner. Variant styling (colors, padding, border) comes via
// `className`. See AGENTS.md (Code conventions → Buttons).
export const AppButton: FC<AppButtonProps> = ({
  icon: Icon,
  isBusy = false,
  type = 'button',
  disabled,
  className,
  children,
  ...rest
}) => {
  const isDisabled = disabled || isBusy;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cn(
        'flex items-center gap-2 rounded',
        isDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
      {...rest}
    >
      {isBusy ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        Icon && <Icon className="size-4" />
      )}
      {children}
    </button>
  );
};
