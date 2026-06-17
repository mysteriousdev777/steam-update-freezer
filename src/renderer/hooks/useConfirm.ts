import { useCallback } from 'react';

import type { ConfirmOptions } from '../../shared/types';

/**
 * Renderer seam to the native confirmation dialog (see AGENTS.md). Returns a stable
 * callback resolving to true when the user confirms.
 */
export const useConfirm = () =>
  useCallback((options: ConfirmOptions) => window.freezer.confirm(options), []);
