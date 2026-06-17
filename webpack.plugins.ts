import type { Configuration } from 'webpack';

// No type-checking in the build by design: ts-loader runs `transpileOnly` and types are
// reviewed in the IDE (see AGENTS.md). Without ForkTsChecker the build transpiles only and
// never spams type errors to the terminal.
export const plugins: Configuration['plugins'] = [];
