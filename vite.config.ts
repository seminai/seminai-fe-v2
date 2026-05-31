import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), tailwindcss()],
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
              vendor: ["react", "react-dom"],
              router: ["react-router-dom"],
              ui: [
                "@radix-ui/react-dialog",
                "@radix-ui/react-dropdown-menu",
                "@radix-ui/react-select",
              ],
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
