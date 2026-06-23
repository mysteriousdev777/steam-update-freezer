import { toast } from 'sonner';
import { SteamToast } from '../components/SteamToast';

// Error toasts linger longer than the sonner default (~4s) so there's time to read them.
const ERROR_TOAST_DURATION_MS = 8000;

export const showSuccessToast = (message: string) =>
  toast.custom(() => <SteamToast message={message} type="success" />);

export const showErrorToast = (message: string) =>
  toast.custom(() => <SteamToast message={message} type="error" />, {
    duration: ERROR_TOAST_DURATION_MS,
  });
