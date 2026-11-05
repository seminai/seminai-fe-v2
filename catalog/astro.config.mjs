import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
export default defineConfig({ site: 'https://seminai.tech', output: 'server', session: false, build: { assets: 'catalog-assets' }, trailingSlash: 'always', adapter: cloudflare({ imageService: 'passthrough' }), vite: { build: { assetsDir: 'catalog-assets' } } });
