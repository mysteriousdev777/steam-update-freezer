import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { PublisherGithub } from '@electron-forge/publisher-github';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

import { version } from './package.json';
import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

// Load .env so GITHUB_TOKEN is available to the GitHub publisher at `publish` time.
import 'dotenv/config';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: './assets/favicon',
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      setupIcon: './assets/favicon.ico',
      setupExe: `SteamUpdateFreezer-Setup-${version}.exe`,
      // "Installed apps" entry icon; without it Squirrel falls back to the
      // default Electron icon. HEAD tracks the default branch across renames.
      iconUrl:
        'https://raw.githubusercontent.com/mysteriousdev777/steam-update-freezer/HEAD/assets/favicon.ico',
    }),
    new MakerZIP({}, ['darwin']),
  ],
  publishers: [
    new PublisherGithub({
      repository: {
        owner: 'mysteriousdev777',
        name: 'steam-update-freezer',
      },
      // Upload artifacts to a draft release (visible only to repo collaborators);
      // review and hit "Publish release" on GitHub manually. Auth via GITHUB_TOKEN (.env).
      draft: true,
      prerelease: false,
    }),
  ],
  hooks: {
    // Publish only the installer: drop Squirrel's auto-update artifacts (.nupkg / RELEASES)
    // from the results the publisher uploads. We ship no autoUpdater, so they're dead weight.
    // Files stay on disk in out/make/ — this only trims what gets published.
    postMake: async (_config, makeResults) => {
      for (const result of makeResults) {
        result.artifacts = result.artifacts.filter(file => file.endsWith('.exe'));
      }

      return makeResults;
    },
  },
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      // Disable Forge's default dev CSP header so <meta> is the sole CSP source; else it AND-combines
      // and its `default-src 'self'` blocks whatever <meta> adds. '' respected via `??`.
      devContentSecurityPolicy: '',
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/renderer/index.html',
            js: './src/renderer/index.tsx',
            name: 'main_window',
            preload: {
              js: './src/preload/index.ts',
            },
          },
        ],
      },
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
