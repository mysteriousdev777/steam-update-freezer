import { Component, type ErrorInfo, type ReactNode } from 'react';

import { AlertTriangle, RefreshCw } from 'lucide-react';

import { AppButton } from '@/renderer/components/AppButton';

type ErrorBoundaryProps = {
  children: ReactNode;
  // Reporter from useRendererErrorReporting. A class can't use a hook, so the boundary reports
  // via prop rather than touching window.freezer itself.
  onError: (message: string, stack?: string) => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

// Last-resort catch for render-time crashes in the React tree below it: shows a recoverable
// fallback instead of a blank window.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError(error.message, `${error.stack ?? ''}\n${info.componentStack ?? ''}`);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-steam-bg p-6 text-steam-text">
        <AlertTriangle className="size-10 text-steam-warn" />
        <p className="text-lg font-semibold">Something went wrong.</p>
        <p className="max-w-sm text-center text-sm text-steam-muted">
          The app hit an unexpected error. Reloading usually fixes it; your frozen games on disk are
          untouched.
        </p>
        <AppButton
          icon={RefreshCw}
          onClick={() => window.location.reload()}
          className="border border-steam-panel px-4 py-2 text-steam-accent hover:border-steam-accent"
        >
          Reload
        </AppButton>
      </div>
    );
  }
}
