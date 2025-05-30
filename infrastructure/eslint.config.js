import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import globals from 'globals';

export default [
  eslint.configs.recommended,
  {
    ignores: [
      '**/node_modules/**',
      '**/cdk.out/**',
      '**/lib/**/*.js',
      '**/lib/**/*.d.ts',
      '**/.DS_Store',
      '**/coverage/**',
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettier,
    },
    rules: {
      // Prettier integration
      'prettier/prettier': 'error',

      // Disable base no-unused-vars in favor of TypeScript version
      'no-unused-vars': 'off',

      // TypeScript rules
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // AWS CDK/Infrastructure specific rules
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-process-exit': 'warn',
      'no-path-concat': 'error',

      // CDK best practices (without type-checking rules)
      '@typescript-eslint/no-inferrable-types': 'off',
    },
  },
  {
    // Rules for JavaScript files (like scripts)
    files: ['**/*.js'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script',
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      prettier: prettier,
    },
    rules: {
      // Prettier integration
      'prettier/prettier': 'error',

      // JavaScript-specific rules
      'no-console': 'off', // Allow console in scripts
      'prefer-const': 'error',
      'no-var': 'error',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
];
