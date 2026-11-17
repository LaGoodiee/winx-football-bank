import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // In development, API calls go to `wrangler pages dev` (Pages Functions + local D1/R2).
    proxy: { '/api': { target: 'http://127.0.0.1:8788', changeOrigin: false } },
  },
});
