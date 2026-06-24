/**
 * Renderer entry: loads global styles and mounts the React app into #root. The renderer
 * runs with Node integration disabled and context isolation on, reaching the main process
 * only through the `window.freezer` bridge that preload sets up. See AGENTS.md (Architecture).
 */

import './index.css';
import { StrictMode, type FC } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConfirmProvider } from './hooks/useConfirm';
import { useRendererErrorReporting } from './hooks/useRendererErrorReporting';

// Wires error reporting (the hook installs the global listeners and is the single window.freezer
// seam) and wraps the app in the ErrorBoundary. Sits above the boundary, so it stays trivial —
// nothing here should throw on its own.
const Root: FC = () => {
  const reportError = useRendererErrorReporting();

  return (
    <ErrorBoundary onError={reportError}>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </ErrorBoundary>
  );
};

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  );
}
