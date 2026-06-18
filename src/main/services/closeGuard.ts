// Tracks whether updates are unblocked, so main/index.ts can guard against an accidental quit.
let isUpdateUnblocked = false;

export const setUpdateUnblocked = (isUnblocked: boolean): void => {
  isUpdateUnblocked = isUnblocked;
};

export const isUpdateCurrentlyUnblocked = (): boolean => isUpdateUnblocked;
