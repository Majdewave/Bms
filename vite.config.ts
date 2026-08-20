import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath, URL } from 'node:url'

const eventsBrowserEntry = fileURLToPath(
  new URL('./node_modules/events/events.js', import.meta.url)
)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      events: eventsBrowserEntry,
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        format: 'es',
      },
    },
  },
})
