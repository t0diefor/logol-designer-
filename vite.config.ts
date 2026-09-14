import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        /*
         * Split long-lived dependencies out of the app chunk.
         *
         * This does not reduce the total bytes downloaded on a first visit --
         * it improves repeat visits, because shipping an app change no longer
         * invalidates the cached copy of React. Grouped by release cadence:
         * these three move far less often than our own code.
         */
        // Rolldown (Vite 8) requires the function form here.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/zod/')) return 'vendor-validation'
          if (id.includes('/motion') || id.includes('/framer-motion')) return 'vendor-motion'
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor-react'
          }
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
