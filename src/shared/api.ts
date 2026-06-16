// Shape of the bridge API exposed on `window.freezer`.
// Imported as a *type* by both preload (which implements it) and renderer (which
// consumes it). Type-only imports are erased at build time, so there is no runtime
// coupling between the two bundles. See docs/DECISIONS.md (§1).
export type FreezerApi = {
  /** Round-trip smoke test of the preload bridge: returns a string from the main process. */
  ping: () => Promise<string>;
};
