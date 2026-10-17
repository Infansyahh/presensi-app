import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Dev: frontend lokal memanggil /api tanpa CORS, backend tetap jalan di 3000.
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});