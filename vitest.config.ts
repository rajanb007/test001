// PlaneSpotter test runner config. Author CKC. Version 1.0.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'packages/**/*.test.ts', 'apps/**/*.test.ts'],
    environment: 'node',
    // The live tests share one Postgres and reset it between cases, so running
    // test files in parallel makes them wipe each other's fixtures. Every file
    // passed alone and the suite failed together until this was set. The
    // static tests are milliseconds, so serial execution costs almost nothing.
    fileParallelism: false,
  },
});
