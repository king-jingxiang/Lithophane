import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base keeps the build portable on GitHub Pages (project sites).
export default defineConfig({
  base: './',
  plugins: [react()],
  worker: {
    format: 'es',
  },
})
