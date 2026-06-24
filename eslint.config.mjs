// ESLint 9 flat config. NOTE: agents do not run the linter — the maintainer controls
// linting in the IDE (see AGENTS.md, "Linting"). This config is the source of truth for
// the rules they see.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  // Never lint build output or dependencies.
  {
    ignores: ['.webpack/**', 'out/**', 'dist/**', 'node_modules/**'],
  },

  // Base recommended rule sets.
  js.configs.recommended,
  tseslint.configs.recommended,

  // Node-side code: main process, preload, shared, and root tooling configs.
  {
    files: ['src/main/**/*.ts', 'src/preload/**/*.ts', 'src/shared/**/*.ts', '*.{js,mjs,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Renderer runs in the browser, with React hooks rules.
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'off',
      // Renderer is arrow-only; main/services keep `function` declarations for hoisting
      // (AGENTS.md → Function style).
      'func-style': ['error', 'expression'],
    },
  },

  // Turns off rules that conflict with Prettier and reports formatting differences
  // through the `prettier/prettier` rule.
  prettierRecommended,

  // Project rule overrides — must come after prettierRecommended so the prettier/prettier
  // severity below wins. (react-hooks rules live in the renderer block above.)
  {
    rules: {
      'padding-line-between-statements': [
        'warn',
        { blankLine: 'always', prev: '*', next: ['return', 'if'] },
        { blankLine: 'always', prev: 'if', next: '*' },
      ],
      // Callbacks are always arrows (AGENTS.md → Function style).
      'prefer-arrow-callback': 'error',
      // Declare types with `type`, never `interface` (AGENTS.md → Code conventions).
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'prettier/prettier': 'warn',
    },
  },

  // Exception: ambient declarations need `interface` for declaration merging (e.g. augmenting
  // the global Window in src/types/global.d.ts), so the type-only rule can't apply there.
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
);
