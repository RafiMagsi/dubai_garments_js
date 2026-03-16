import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    reporters: ['default', 'json'],
    outputFile: '.qa/vitest-results.json',
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary', 'lcov'],
      reportsDirectory: '.qa/coverage',
      include: ['lib/**/*.ts', 'features/**/*.ts', 'app/api/**/*.ts'],
      exclude: ['**/*.d.ts', '**/node_modules/**', '**/.next/**'],
    },
  },
});

