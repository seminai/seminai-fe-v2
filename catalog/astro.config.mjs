import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import {fileURLToPath} from 'node:url';

export default defineConfig({
 site: 'https://seminai.tech', output: 'server', session: false,
 build: {assets: 'catalog-assets'}, trailingSlash: 'always',
 adapter: cloudflare({imageService: 'passthrough'}), integrations: [react()],
 vite: {build: {assetsDir: 'catalog-assets'}, resolve: {
  alias: {'@': fileURLToPath(new URL('../src', import.meta.url))},
  dedupe: ['react', 'react-dom', 'i18next', 'react-i18next'],
 }},
});
