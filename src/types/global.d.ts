// Global type augmentations.
import type { FreezerApi } from '../shared/api';

declare global {
  interface Window {
    // The preload bridge (see src/preload). Renderer code reaches main only through this.
    freezer: FreezerApi;
  }
}
