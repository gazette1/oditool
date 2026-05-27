import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// SerpAPI doesn't send CORS headers, so we proxy its endpoints through
// the Vite dev server. The browser hits /api/serpapi/* (same-origin) and
// Vite forwards the request to serpapi.com server-side.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,         // v1.7.x · fail loud if 3000 is taken instead of silently rolling to 3001
    host: 'localhost',
    open: true,               // auto-open browser to http://localhost:3000 on `npm run dev`
    proxy: {
      '/api/serpapi': {
        target: 'https://serpapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/serpapi/, ''),
      },
    },
  },
});
