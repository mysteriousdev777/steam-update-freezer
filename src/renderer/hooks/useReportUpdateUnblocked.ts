import { useCallback } from 'react';

/**
 * Renderer seam reporting whether updates are currently unblocked, so the main process
 * can guard a quit attempt with a confirmation (see AGENTS.md).
 */
export const useReportUpdateUnblocked = () =>
  useCallback((isUnblocked: boolean) => window.freezer.reportUpdateUnblocked(isUnblocked), []);
