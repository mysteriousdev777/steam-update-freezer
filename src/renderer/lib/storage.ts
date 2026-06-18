// Guarded access to `window.localStorage` — the only module that touches it. Holds no
// knowledge of what's stored; entity-specific keys and getters live elsewhere (see
// settings.ts). Wrapped because localStorage can throw (disabled, quota).
export const storage = {
  read(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  write(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Best-effort persistence — ignore failures.
    }
  },

  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Best-effort — ignore failures.
    }
  },
};
