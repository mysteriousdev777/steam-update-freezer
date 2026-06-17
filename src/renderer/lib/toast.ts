import { toast } from 'sonner';

// Thin wrappers over sonner so call sites use our own API and theming/defaults stay in one
// place. The <Toaster/> is mounted in App.tsx. See AGENTS.md (Stack).
export const showSuccessToast = (message: string) => toast.success(message);
export const showErrorToast = (message: string) => toast.error(message);
