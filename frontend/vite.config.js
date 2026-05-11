import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    proxy: {
      '/api': { target: 'http://backend:3000', changeOrigin: true }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/test-utils/**',
        'src/test-setup.js',
        'src/main.jsx',
      ],
      thresholds: {
        'src/services/authApi.js':              { lines: 90, functions: 90, branches: 90, statements: 90 },
        'src/hooks/useLoginForm.js':            { lines: 90, functions: 90, branches: 90, statements: 90 },
        'src/context/AuthProvider.jsx':         { lines: 85, functions: 85, branches: 85, statements: 85 },
        'src/features/auth/LoginForm.jsx':      { lines: 85, functions: 85, branches: 85, statements: 85 },
        'src/components/ProtectedRoute.jsx':    { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/components/AdminRoute.jsx':        { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/utils/validation.js':              { lines: 100, functions: 100, branches: 100, statements: 100 },
      },
    },
  }
})
