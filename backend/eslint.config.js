import { baseConfig } from '../eslint.config.js';

export default [
  {
    files: ['**/*.{js,ts}'],
    ...baseConfig,
    rules: {
      ...baseConfig.rules,
      // Add backend-specific rules here
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
