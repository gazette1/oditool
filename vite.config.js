import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// SerpAPI doesn't send CORS headers, so we proxy its endpoints through
// the Vite dev server. The browser hits /api/serpapi/* (same-origin) and
// Vite forwards the request to serpapi.com server-side.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/serpapi': {
        target: 'https://serpapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/serpapi/, ''),
      },
    },
  },
});
