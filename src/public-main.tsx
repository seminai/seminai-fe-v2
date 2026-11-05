import { StrictMode, Suspense } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import "./i18n/public";
import PublicApp from "./PublicApp";
import { registerSeminaiWebMcpTools } from "./lib/webmcp";
import { installDemoClickTracking } from "./lib/analytics";
registerSeminaiWebMcpTools();
installDemoClickTracking();
const container = document.getElementById("root")!;
const app = (
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
          <PublicApp />
        </Suspense>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);
if (container.hasChildNodes()) hydrateRoot(container, app);
else createRoot(container).render(app);
