import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

import react from '@astrojs/react';
import node from '@astrojs/node';

import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  security: {
    // Origin check for state-changing requests (CSRF defense for form POSTs
    // like the dashboard account-deletion action). Same-origin JSON fetches
    // to /api/* are unaffected.
    checkOrigin: true,
  },

  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['libsodium', 'libsodium-wrappers']
    }
  }
});