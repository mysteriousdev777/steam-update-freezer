import { app, BrowserWindow, screen } from 'electron';
import fs from 'fs';
import path from 'path';

type WindowState = {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized?: boolean;
};

// Minimum on-screen square (px per side) a restored window must keep visible.
const MIN_VISIBLE = 64;

export function createWindowState(defaultWidth: number, defaultHeight: number) {
  const stateFile = path.join(app.getPath('userData'), 'window-state.json');
  const state: WindowState = { width: defaultWidth, height: defaultHeight };

  try {
    if (fs.existsSync(stateFile)) {
      const parsed = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));

      // Only adopt a fully-valid size; x/y and isMaximized are optional extras.
      if (
        Number.isFinite(parsed.width) &&
        parsed.width > 0 &&
        Number.isFinite(parsed.height) &&
        parsed.height > 0
      ) {
        state.width = parsed.width;
        state.height = parsed.height;
        state.isMaximized = parsed.isMaximized === true;

        if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
          state.x = parsed.x;
          state.y = parsed.y;
        }
      }
    }
  } catch {
    // Fall back to defaults on a missing or corrupt file.
  }

  // Drop a saved position if too little of the window would land on a connected
  // display (e.g. a monitor was unplugged while the app was closed), so Electron
  // centers it on the primary display instead.
  if (state.x !== undefined && state.y !== undefined) {
    const visible = screen.getAllDisplays().reduce((max, { workArea: a }) => {
      const w = Math.max(
        0,
        Math.min(state.x! + state.width, a.x + a.width) - Math.max(state.x!, a.x),
      );
      const h = Math.max(
        0,
        Math.min(state.y! + state.height, a.y + a.height) - Math.max(state.y!, a.y),
      );

      return Math.max(max, w * h);
    }, 0);

    if (visible < MIN_VISIBLE * MIN_VISIBLE) {
      delete state.x;
      delete state.y;
    }
  }

  // Clamp the size to the target display's work area so a window saved on a larger
  // monitor doesn't open bigger than the current screen.
  const target =
    state.x !== undefined && state.y !== undefined
      ? screen.getDisplayMatching({
          x: state.x,
          y: state.y,
          width: state.width,
          height: state.height,
        })
      : screen.getPrimaryDisplay();

  state.width = Math.min(state.width, target.workArea.width);
  state.height = Math.min(state.height, target.workArea.height);

  const saveState = (win: BrowserWindow) => {
    try {
      state.isMaximized = win.isMaximized();

      // Record bounds only in the normal state; minimized/maximized sizes aren't
      // what we want to restore to.
      if (!win.isMinimized() && !state.isMaximized) {
        const [width, height] = win.getContentSize();
        const [x, y] = win.getPosition();
        state.x = x;
        state.y = y;
        state.width = width;
        state.height = height;
      }

      fs.writeFileSync(stateFile, JSON.stringify(state));
    } catch {
      // Ignore write errors (e.g. disk full).
    }
  };

  const manage = (win: BrowserWindow) => {
    if (state.isMaximized) win.maximize();

    let saveTimeout: NodeJS.Timeout;

    // Debounce resize/move so we don't hit the disk on every event.
    const saveHandler = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => saveState(win), 500);
    };

    win.on('resize', saveHandler);
    win.on('move', saveHandler);
    win.on('close', () => saveState(win));
  };

  return {
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    manage,
  };
}
