import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    css: true,
    exclude: [...configDefaults.exclude, 'tests/db/**'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'html'],

      // Only measure your actual project code
      include: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}'
      ],

      exclude: [
        '**/node_modules/**',
        '**/.next/**',
        '**/coverage/**',
        '**/dist/**',
        '**/build/**',
        '**/out/**',
        '**/.vercel/**',

        '**/tests/**',
        '**/__tests__/**',
        '**/test/**',
        '**/*.test.*',
        '**/*.spec.*',

        // optional: config files / generated
        '**/*.config.*',
        '**/next-env.d.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
})
