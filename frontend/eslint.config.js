import js from '@eslint/js';
import pluginQuery from '@tanstack/eslint-plugin-query';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config([
  ...pluginQuery.configs['flat/recommended'],
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Keep enabled globally with allowConstantExport for better Fast Refresh
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Shadcn UI components - allow exporting variants alongside components
    files: ['src/components/shadcn/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
      'react-hooks/rules-of-hooks': 'off', // Shadcn components may have non-standard patterns
      'react-compiler/react-compiler': 'off', // Disable React Compiler rules for third-party components
      'react-hooks/purity': 'off', // Allow impure functions like Math.random() in shadcn components
    },
  },
  {
    // Provider files - must export both provider component and hooks (standard React pattern)
    files: ['src/providers/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
]);
