import webpack, { type Configuration } from 'webpack';

import 'dotenv/config';

// No type-checking in the build by design: ts-loader runs `transpileOnly` and types are
// reviewed in the IDE (see AGENTS.md). Without ForkTsChecker the build transpiles only and
// never spams type errors to the terminal.
export const plugins: Configuration['plugins'] = [
  // `''` default keeps the key optional so keyless builds compile (the array form errors when unset).
  // It stays a plain `string` (Node env semantics), and `!APTABASE_APP_KEY` treats unset as off.
  new webpack.EnvironmentPlugin({ APTABASE_APP_KEY: '' }),
];
