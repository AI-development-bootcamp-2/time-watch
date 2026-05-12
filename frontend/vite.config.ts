import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    proxy: {
      '/api': { target: process.env.BACKEND_URL || 'http://localhost:3000', changeOrigin: true }
    }
  },
  optimizeDeps: {
    include: ['@hebcal/core'],
    esbuildOptions: { target: 'es2022' }
  },
  build: {
    target: 'es2022'
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'src/test-utils/**',
        'src/test-setup.js',
        'src/main.tsx',
      ],
      thresholds: {
        lines: 30,
        functions: 30,
        branches: 30,
        statements: 30,
      },
    },
  },
})
