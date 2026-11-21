import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    poolOptions: {
      forks: {
        execArgv: ['--experimental-sqlite'],
      },
    },
    environmentMatchGlobs: [['tests/**/*.test.tsx', 'jsdom']],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 15000,
  },
});
