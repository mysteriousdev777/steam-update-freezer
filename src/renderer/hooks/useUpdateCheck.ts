import { useEffect, useState } from 'react';

type UpdateInfo = {
  hasUpdate: boolean;
  latestVersion?: string;
  htmlUrl?: string;
};

const isNewer = (latestVersion: string, currentVersion: string): boolean => {
  const toParts = (version: string): number[] =>
    version.split('.').map(part => Number.parseInt(part, 10) || 0);

  const latestParts = toParts(latestVersion);
  const currentParts = toParts(currentVersion);

  for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
    const latestPart = latestParts[i] ?? 0;
    const currentPart = currentParts[i] ?? 0;

    if (latestPart !== currentPart) return latestPart > currentPart;
  }

  return false;
};

export const useUpdateCheck = (isEnabled: boolean): UpdateInfo => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({ hasUpdate: false });

  useEffect(() => {
    // Disabled in Settings: clear any shown badge and skip the GitHub request entirely.
    if (!isEnabled) {
      setUpdateInfo({ hasUpdate: false });

      return;
    }

    // Guards against a stale in-flight check writing after this effect run is superseded (e.g. the
    // user disables update checks while the initial fetch is still pending).
    let isCurrent = true;

    const check = async () => {
      try {
        const appInfo = await window.freezer.getAppInfo();
        const currentVersion = appInfo.version;

        const result = await window.freezer.getLatestRelease();

        // Fail silently on any fetch/parse error so a failed check never breaks the UI.
        if (!result.ok) return;

        const data = result.release;

        const tag = data.tag_name || '';
        const latestVersion = tag.replace(/^v/, ''); // strip 'v' prefix if present

        if (isCurrent && isNewer(latestVersion, currentVersion)) {
          setUpdateInfo({
            hasUpdate: true,
            latestVersion,
            htmlUrl: data.html_url,
          });
        }
      } catch (e) {
        // Safety net for any unexpected rejection (getLatestRelease returns errors as values now,
        // never throws); ignore silently so a failed check doesn't break the UI.
        console.error('Update check failed:', e);
      }
    };

    void check();

    return () => {
      isCurrent = false;
    };
  }, [isEnabled]);

  return updateInfo;
};
