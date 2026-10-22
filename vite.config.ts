import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// Em desenvolvimento o browser fala com /api (mesma origem) e o Vite encaminha
// para o backend, o que evita problemas de CORS.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const BACKEND = env.VITE_BACKEND_URL || 'https://clacs-school-backend.onrender.com'
  return {
    plugins: [react()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      port: 5173,
      proxy: { '/api': { target: BACKEND, changeOrigin: true, secure: true } },
    },
  }
})
