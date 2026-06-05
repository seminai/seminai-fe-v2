/**
 * Server entry used ONLY at build time by scripts/prerender.mjs (vite build --ssr).
 *
 * It deliberately mounts a MINIMAL public-only router instead of the full <App/>: the
 * protected routes import leaflet/socket.io which touch `window` at module load and would
 * crash Node. The runtime client router (src/App.tsx) is unchanged. Markup rendered here
 * for each public URL matches what the client renders for the same URL, so hydration is clean.
 */
import { renderToString } from "react-dom/server";
import { Suspense } from "react";
import { StaticRouter, Routes, Route } from "react-router";
import { HelmetProvider, type HelmetServerState } from "react-helmet-async";
import i18n from "./i18n";

import Home from "./routes/Home";
import PrivacyPolicy from "./routes/PrivacyPolicy";
import CookiePolicy from "./routes/CookiePolicy";
import TermsOfService from "./routes/TermsOfService";

export interface RenderResult {
  html: string;
  head: string;
}

export async function render(url: string, lng = "it"): Promise<RenderResult> {
  await i18n.changeLanguage(lng);

  const helmetContext: { helmet?: HelmetServerState } = {};

  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={url}>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
          </Routes>
        </Suspense>
      </StaticRouter>
    </HelmetProvider>,
  );

  const { helmet } = helmetContext;
  const head = helmet
    ? [
        helmet.title.toString(),
        helmet.meta.toString(),
        helmet.link.toString(),
        helmet.script.toString(),
      ]
        .filter(Boolean)
        .join("")
    : "";

  return { html, head };
}
