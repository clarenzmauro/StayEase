import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true, // This exposes the server to your local network
    port: 5173, // Default Vite port
  },
  optimizeDeps: {
    include: [
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/storage'
    ]
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage']
        }
      }
    }
  }
})