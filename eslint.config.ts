import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import prettier from 'eslint-config-prettier';
import stylistic from '@stylistic/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    '**/node_modules/',
    '**/.next/',
    '**/dist/',
    '**/dist-test/',
    '**/next-env.d.ts',
    'packages/contracts/src/openapi.d.ts',
    'e2e/.results/',
    'apps/web/public/mockServiceWorker.js',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  { plugins: { '@stylistic': stylistic } },
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: { allowDefaultProject: ['*.ts'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': [
        'error',
        { allowForKnownSafeCalls: [{ from: 'package', package: 'node:test', name: ['test', 'describe', 'it'] }] },
      ],
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'smart'],
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: 'directive', next: '*' },
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'any', prev: 'import', next: 'import' },
        { blankLine: 'always', prev: ['const', 'let'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let'], next: ['const', 'let'] },
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: '*', next: 'multiline-block-like' },
        { blankLine: 'always', prev: 'multiline-block-like', next: '*' },
      ],
      'id-length': ['error', { min: 2, exceptions: ['_', 'x', 'y'], properties: 'never' }],
      'max-depth': ['error', 3],
      'max-nested-callbacks': ['error', 3],
      'no-nested-ternary': 'error',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest'], nextPlugin.configs['core-web-vitals']],
    languageOptions: { globals: globals.browser },
    settings: { next: { rootDir: 'apps/web' } },
    // React Compiler is not enabled (next.config.ts), so its bail-out rules are advisory here
    rules: { 'react-hooks/set-state-in-effect': 'warn', 'react-hooks/purity': 'warn' },
  },
  {
    // Nest resolves providers through emitted decorator metadata, so constructor-injected classes must stay value imports
    files: ['apps/api/src/**/*.ts'],
    rules: { '@typescript-eslint/consistent-type-imports': 'off' },
  },
  prettier,
);
