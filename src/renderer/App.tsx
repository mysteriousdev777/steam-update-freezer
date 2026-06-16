import { useEffect, useState, type FC } from 'react';

export const App: FC = () => {
  const [status, setStatus] = useState('preload bridge: checking…');
  const [ok, setOk] = useState<boolean | null>(null);

  // Step 1 smoke test, now in React: confirm the renderer can round-trip to main.
  useEffect(() => {
    let cancelled = false;

    if (!window.freezer || typeof window.freezer.ping !== 'function') {
      setStatus('preload bridge unavailable: window.freezer not found');
      setOk(false);

      return;
    }

    window.freezer
      .ping()
      .then(reply => {
        if (cancelled) return;

        setStatus(`preload bridge OK — main replied: "${reply}"`);
        setOk(true);
        console.log('[bridge] ping ->', reply);
      })
      .catch(err => {
        if (cancelled) return;

        setStatus(`ping failed: ${String(err)}`);
        setOk(false);
        console.error('[bridge] ping failed', err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const statusColor = ok === null ? 'text-steam-muted' : ok ? 'text-steam-ok' : 'text-steam-warn';
  const statusIcon = ok === null ? '…' : ok ? '✅' : '❌';

  return (
    <div className="min-h-screen bg-steam-bg text-steam-text">
      <header className="bg-steam-bar px-4 py-2 text-sm font-semibold tracking-wide">
        ❄ VERSION FREEZER
      </header>
      <main className="p-6">
        <h1 className="mb-3 text-xl font-bold">Steam Version Freezer</h1>
        <p className={statusColor}>
          {statusIcon} {status}
        </p>
      </main>
    </div>
  );
};
