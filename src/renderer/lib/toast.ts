import { toast } from 'sonner';

// Error toasts linger longer than the sonner default (~4s) so there's time to read them.
const ERROR_TOAST_DURATION_MS = 8000;

// Thin wrappers over sonner so call sites use our own API and theming/defaults stay in one
// place. The <Toaster/> is mounted in App.tsx. See AGENTS.md (Stack).
export const showSuccessToast = (message: string) => toast.success(message);
export const showErrorToast = (message: string) =>
  toast.error(message, { duration: ERROR_TOAST_DURATION_MS });
