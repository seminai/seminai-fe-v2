import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import i18n from "./i18n";
import { registerSeminaiWebMcpTools } from "@/lib/webmcp";
import App from "./App.tsx";

registerSeminaiWebMcpTools();

// News pages take their language from the URL; match it before hydrating so the
// shared nav and footer render the same copy as the prerendered HTML.
const { pathname } = window.location;
if (pathname.startsWith("/en/news")) {
  void i18n.changeLanguage("en");
} else if (pathname.startsWith("/news")) {
  void i18n.changeLanguage("it");
}

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
