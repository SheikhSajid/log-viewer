import { execFileSync } from 'node:child_process';
import path from 'node:path';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: './assets/icon', // Forge picks the right extension per platform (.icns on macOS)
    // A dedicated bundle id keeps macOS privacy permissions (e.g. Downloads access) specific to this app
    appBundleId: 'io.vivi.log-viewer',
    extendInfo: {
      NSDownloadsFolderUsageDescription: 'Log Viewer lists and opens the box logs you have downloaded to the Downloaded Box Logs folder.',
    },
  },
  rebuildConfig: {},
  hooks: {
    // Unsigned builds get an ad-hoc signature whose identifier is the generic "com.github.Electron",
    // shared with every other unsigned Electron app. Re-sign with the app's own identifier so macOS
    // (TCC) tracks permissions for this app alone.
    postPackage: async (_config, packageResult) => {
      if (packageResult.platform !== 'darwin') return;
      for (const outputPath of packageResult.outputPaths) {
        execFileSync('codesign', ['--force', '--deep', '--sign', '-', '--identifier', 'io.vivi.log-viewer', path.join(outputPath, 'log-viewer.app')]);
      }
    },
  },
  makers: [new MakerSquirrel({}), new MakerZIP({}, ['darwin']), new MakerRpm({}), new MakerDeb({})],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      // Off: the app stores no cookies, and with ad-hoc signing every rebuild re-prompts for the
      // "log-viewer Safe Storage" keychain item that holds the cookie encryption key
      [FuseV1Options.EnableCookieEncryption]: false,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
