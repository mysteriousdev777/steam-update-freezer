import type { AcfError } from '../../shared/types';

// The public Steam build data we need: build id + each depot's public manifest gid.
type SteamBuildInfo = { buildId: string; depotManifests: Record<string, string> };

export type SteamBuildInfoResult =
  | { ok: true; info: SteamBuildInfo }
  | { ok: false; error: AcfError };

// One attempt's outcome plus whether its failure is worth retrying.
type Attempt = { result: SteamBuildInfoResult; isRetryable: boolean };

const STEAMCMD_API = 'https://api.steamcmd.net/v1/info';
const TIMEOUT_MS = 10000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches the current public build id and per-depot manifest gids for an app from
 * api.steamcmd.net. Retries transient failures (network/timeout, HTTP 5xx/429) up to
 * MAX_ATTEMPTS with a short backoff; returns immediately on success or a permanent error
 * (HTTP 4xx, bad data). Never throws.
 */
export async function fetchPublicBuildInfo(appId: string): Promise<SteamBuildInfoResult> {
  let last: SteamBuildInfoResult = {
    ok: false,
    error: { kind: 'network', message: 'Steam API request failed.' },
  };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { result, isRetryable } = await attemptFetch(appId);

    if (result.ok || !isRetryable) return result;

    last = result;

    if (attempt < MAX_ATTEMPTS) await delay(RETRY_DELAY_MS * attempt);
  }

  return last;
}

// A single request attempt. Network/timeout and HTTP 5xx/429 are flagged retryable; HTTP 4xx
// and parse failures are not.
async function attemptFetch(appId: string): Promise<Attempt> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;

  try {
    res = await fetch(`${STEAMCMD_API}/${encodeURIComponent(appId)}`, {
      signal: controller.signal,
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';

    return {
      isRetryable: true,
      result: {
        ok: false,
        error: {
          kind: 'network',
          message: isTimeout
            ? `Steam API timed out after ${TIMEOUT_MS} ms.`
            : `Steam API network error: ${String(err)}`,
        },
      },
    };
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    return {
      isRetryable: res.status >= 500 || res.status === 429,
      result: {
        ok: false,
        error: { kind: 'http', message: `Steam API returned HTTP ${res.status}.` },
      },
    };
  }

  let json: unknown;

  try {
    json = await res.json();
  } catch (err) {
    return {
      isRetryable: false,
      result: {
        ok: false,
        error: { kind: 'parse', message: `Could not parse Steam API response: ${String(err)}` },
      },
    };
  }

  return { isRetryable: false, result: extractBuildInfo(appId, json) };
}

// Pulls buildid (depots.branches.public.buildid) and each depot's public manifest gid
// (depots.<id>.manifests.public.gid) out of the loosely-typed JSON.
function extractBuildInfo(appId: string, json: unknown): SteamBuildInfoResult {
  const depots = pick(json, 'data', appId, 'depots');

  if (!depots || typeof depots !== 'object') {
    return {
      ok: false,
      error: { kind: 'parse', message: `Steam API has no depot data for ${appId}.` },
    };
  }

  const buildId = pickString(depots, 'branches', 'public', 'buildid');

  if (!buildId) {
    return {
      ok: false,
      error: { kind: 'parse', message: `Steam API has no public buildid for ${appId}.` },
    };
  }

  const depotManifests: Record<string, string> = {};

  for (const [depotId, depot] of Object.entries(depots as Record<string, unknown>)) {
    if (depotId === 'branches') continue;

    const gid = pickString(depot, 'manifests', 'public', 'gid');

    if (gid) depotManifests[depotId] = gid;
  }

  return { ok: true, info: { buildId, depotManifests } };
}

// Walks nested object keys over unknown JSON, returning the value or undefined.
function pick(root: unknown, ...keys: string[]): unknown {
  let cur = root;

  for (const key of keys) {
    if (!cur || typeof cur !== 'object') return undefined;

    cur = (cur as Record<string, unknown>)[key];
  }

  return cur;
}

// Like pick(), but only returns the value when it's a string.
function pickString(root: unknown, ...keys: string[]): string | undefined {
  const value = pick(root, ...keys);

  return typeof value === 'string' ? value : undefined;
}
