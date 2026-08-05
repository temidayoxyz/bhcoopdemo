import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// GitHub Pages project site: https://temidayoxyz.github.io/seedcoopdemo/
const REPO_NAME = 'seedcoopdemo';

export default defineConfig(({ mode }) => {
  const isPages = mode === 'pages' || process.env.GITHUB_PAGES === 'true';

  return {
    // Required so asset URLs work under /seedcoopdemo/
    base: isPages ? `/${REPO_NAME}/` : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Cloudflare Quick Tunnel hostnames (random *.trycloudflare.com).
      // Leading dot allows the domain and all subdomains.
      allowedHosts: ['.trycloudflare.com'],
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
