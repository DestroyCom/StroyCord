import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/tests/**', 'src/Bot.ts'],
    },
  },
  resolve: {
    alias: {
      src: new URL('./src', import.meta.url).pathname,
    },
  },
});
