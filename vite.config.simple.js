import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Config for simple standalone version
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  }
})



