import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.property.test.ts'],
    pool: 'forks',
    minWorkers: 1,
    maxWorkers: 1,
  },
});
