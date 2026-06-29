import { useCallback } from 'react';

/**
 * Renderer seam reporting whether a quit should be guarded with a confirmation — i.e. updates are
 * unblocked AND the user kept the quit confirmation on (useQuitGuard combines both). Main uses this
 * to decide whether to intercept the window close (see AGENTS.md).
 */
export const useReportQuitGuard = () =>
  useCallback((isEnabled: boolean) => window.freezer.reportQuitGuard(isEnabled), []);
