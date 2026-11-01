import { readFile } from "node:fs/promises";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { parse as parseYaml } from "yaml";

const NEWS_META_PREFIX = "\0news-meta:";

/**
 * `import meta from "./article.mdx?meta"` returns only the article's front matter as JSON.
 * Lists and the homepage need it eagerly, while bodies stay in their own lazy chunks.
 */
function newsFrontmatter(): Plugin {
  return {
    name: "news-frontmatter",
    enforce: "pre",
    resolveId(source, importer) {
      if (!source.endsWith(".mdx?meta")) return null;
      const file = source.slice(0, -"?meta".length);
      const absolute = file.startsWith("/src/")
        ? path.resolve(__dirname, `.${file}`)
        : path.resolve(path.dirname(importer ?? __dirname), file);
      return `${NEWS_META_PREFIX}${absolute}`;
    },
    async load(id) {
      if (!id.startsWith(NEWS_META_PREFIX)) return null;
      const file = id.slice(NEWS_META_PREFIX.length);
      this.addWatchFile(file);
      const source = await readFile(file, "utf-8");
      const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      return `export default ${JSON.stringify(match ? parseYaml(match[1]) : {})};`;
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    // News articles: src/content/news/<lang>/<slug>.mdx (see src/lib/news.ts).
    newsFrontmatter(),
    {
      enforce: "pre",
      ...mdx({ remarkPlugins: [remarkFrontmatter, remarkGfm] }),
    },
    react({ include: /\.(mdx|js|jsx|ts|tsx)$/ }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Bundle react-helmet-async into the SSR build: it ships a CJS main that Node's ESM
  // loader can't named-import when externalized. Bundling lets Vite handle the interop
  // (and keeps a single external React, so Helmet's context collection works server-side).
  ssr: {
    noExternal: ["react-helmet-async"],
  },
  build: {
    // Ottimizzazioni per la produzione.
    // manualChunks è solo per il build client: nel build SSR (prerender)
    // react/react-dom sono moduli external e non possono essere "chunkati".
    rollupOptions: {
      output: isSsrBuild
        ? {}
        : {
            manualChunks: {
              vendor: ["react", "react-dom", "react/jsx-runtime"],
              router: ["react-router-dom"],
            },
          },
    },
    // Genera source maps per il debugging in produzione
    sourcemap: false,
    // Ottimizza la dimensione del bundle
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  // Configurazione per il server di sviluppo
  server: {
    port: 3000,
    host: true,
  },
  // Configurazione per il preview
  preview: {
    port: 4173,
    host: true,
  },
}));
