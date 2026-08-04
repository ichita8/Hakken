import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  // For GitHub Pages deployment at https://<user>.github.io/<repo>/
  // The base path must match the repository name. When building locally
  // or in Bolt (not GitHub Pages), the base is "/".
  base: process.env.GITHUB_PAGES ? '/Hakken/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
