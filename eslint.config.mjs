// PlaneSpotter lint rules. Author CKC. Version 0.1.0.
// Enforces the AGENTS.md section 4 do-not list that a linter can see.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.expo/**', '**/.next/**', 'supabase/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // AGENTS.md section 6, TypeScript strict everywhere, no any.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    // The prefix generator writes SQL to stdout by design.
    files: ['packages/shared/generate-prefix-migration.ts', 'scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
);
