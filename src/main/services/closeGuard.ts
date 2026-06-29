// Tracks whether a quit should be guarded with a confirmation, so main/index.ts can intercept an
// accidental close. The renderer combines the conditions (updates unblocked AND the user kept the
// quit confirmation on) and reports the result — see useQuitGuard.
let isGuardEnabled = false;

export const setQuitGuardEnabled = (isEnabled: boolean): void => {
  isGuardEnabled = isEnabled;
};

export const isQuitGuardEnabled = (): boolean => isGuardEnabled;
