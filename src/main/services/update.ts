import type { GithubRelease, GithubReleaseResult } from '@/shared/types';

import packageJson from '../../../package.json';

const GITHUB_API_LATEST_RELEASE = `https://api.github.com/repos/${packageJson.author}/${packageJson.name}/releases/latest`;

const TIMEOUT_MS = 10000;

/**
 * Fetches the latest release info from the GitHub API. Aborts after TIMEOUT_MS so a hung
 * connection can't leave the promise pending forever. Never throws — network/timeout, non-2xx,
 * and bad JSON are all mapped to a { ok: false, error } result.
 */
export const getLatestRelease = async (): Promise<GithubReleaseResult> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;

  try {
    res = await fetch(GITHUB_API_LATEST_RELEASE, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Steam-Update-Freezer',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10',
      },
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';

    return {
      ok: false,
      error: {
        kind: 'network',
        message: isTimeout
          ? `GitHub API timed out after ${TIMEOUT_MS} ms.`
          : `GitHub API network error: ${String(err)}`,
      },
    };
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    return {
      ok: false,
      error: { kind: 'http', message: `GitHub API returned HTTP ${res.status}.` },
    };
  }

  try {
    const release = (await res.json()) as GithubRelease;

    return { ok: true, release };
  } catch (err) {
    return {
      ok: false,
      error: { kind: 'parse', message: `Could not parse GitHub API response: ${String(err)}` },
    };
  }
};
