import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/vitest/**/*.test.js'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['js/**/*.js'],
    },
  },
})
