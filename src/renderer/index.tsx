/**
 * Renderer entry: loads global styles and mounts the React app into #root. The renderer
 * runs with Node integration disabled and context isolation on, reaching the main process
 * only through the `window.freezer` bridge that preload sets up. See AGENTS.md (Architecture).
 */

import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
