import { useCallback, useEffect } from 'react';

/**
 * Single window.freezer seam for error reporting: forwards renderer errors to the main process's
 * on-disk log. Returns reportError for the ErrorBoundary (a class — gets it via prop), and
 * installs the global listeners for the async errors the boundary can't catch.
 */
export const useRendererErrorReporting = () => {
  const reportError = useCallback((message: string, stack?: string) => {
    // Swallow the rejection — else a failed report fires a fresh unhandledrejection and loops.
    window.freezer.reportRendererError(message, stack).catch(() => {});
  }, []);

  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason: unknown = event.reason;
      reportError(
        `Unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`,
        reason instanceof Error ? reason.stack : undefined,
      );
    };
    const onError = (event: ErrorEvent) => {
      reportError(event.message, event.error instanceof Error ? event.error.stack : undefined);
    };

    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('error', onError);

    return () => {
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('error', onError);
    };
  }, [reportError]);

  return reportError;
};
