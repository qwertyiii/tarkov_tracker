import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Render serves the built static `dist/`. Base is '/' for a root deploy.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
