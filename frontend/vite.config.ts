import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const backend = 'http://127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on the local network so phones on the same Wi-Fi can open the app.
    host: true,
    proxy: {
      '/api': backend,
      '/media': backend,
    },
  },
})
