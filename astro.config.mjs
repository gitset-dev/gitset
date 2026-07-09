import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

import react from '@astrojs/react';
import node from '@astrojs/node';

import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';

// Server-side code (src/lib/env.ts) reads process.env directly, but Vite only
// exposes .env files through import.meta.env — bridge them here so plain
// `pnpm dev` works. Real environment variables always win (production sets
// them directly and ships no .env file, so this is a no-op there).
const fileEnv = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');
for (const [key, value] of Object.entries(fileEnv)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

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