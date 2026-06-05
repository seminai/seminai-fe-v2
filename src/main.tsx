import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import "./i18n";
import { registerSeminaiWebMcpTools } from "@/lib/webmcp";
import App from "./App.tsx";

registerSeminaiWebMcpTools();

const container = document.getElementById("root")!;

const app = (
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);

// Public routes (/, legal pages) are prerendered at build time (see scripts/prerender.mjs).
// Hydrate when server markup is present; otherwise mount fresh (SPA / private routes).
if (container.hasChildNodes()) {
  hydrateRoot(container, app);
} else {
  createRoot(container).render(app);
}
