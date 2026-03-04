import { useLocation } from "react-router-dom";
import { WorkspaceSwitcher } from "@/components/organism/WorkspaceSwitcher";

/**
 * Maps route pathname to page title
 */
function getPageTitle(pathname: string): string {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return "Dashboard";
  }
  if (pathname === "/label" || pathname.startsWith("/label/")) {
    return "Etichette";
  }
  if (pathname === "/job/new") {
    return "Nuova Operazione";
  }
  if (pathname === "/job" || pathname.startsWith("/job/")) {
    return "Operazioni";
  }
  if (pathname === "/operations" || pathname.startsWith("/operations/")) {
    return "Qdca";
  }
  if (pathname === "/company" || pathname.startsWith("/company/")) {
    return "Aziende";
  }
  if (pathname === "/fields" || pathname.startsWith("/fields/")) {
    return "Campi";
  }
  if (
    pathname === "/production-unit" ||
    pathname.startsWith("/production-unit/")
  ) {
    return "Unità Produttive";
  }
  if (pathname === "/products" || pathname.startsWith("/products/")) {
    return "Magazzino";
  }
  if (pathname === "/settings") {
    return "Impostazioni";
  }
  if (pathname === "/new-workspace") {
    return "Nuovo Workspace";
  }
  if (pathname.startsWith("/workspace/settings")) {
    return "Impostazioni Workspace";
  }
  if (pathname === "/new-label") {
    return "Nuova Etichetta";
  }
  if (pathname === "/new-production-unit") {
    return "Nuova Unità Produttiva";
  }
  if (pathname === "/create-company-field-production") {
    return "Creazione Rapida";
  }
  if (pathname === "/new-rule") {
    return "Nuova Regola";
  }
  if (pathname.startsWith("/workspace/settings/rules/")) {
    return "Modifica Regola";
  }

  return "Seminai";
}

/**
 * Mobile header component that shows workspace logo on the left
 * and current page title on the right
 */
export function MobileHeader(): React.ReactElement {
  const location = useLocation();

  const pageTitle = getPageTitle(location.pathname);

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white backdrop-blur-lg">
      <div className="flex items-center justify-between px-4 py-3 h-14 gap-4">
        {/* Workspace logo on the left - only logo, no text */}
        <div className="flex items-center shrink-0">
          <div className="[&>button]:w-auto [&>button]:h-auto">
            <WorkspaceSwitcher collapsed={true} />
          </div>
        </div>

        {/* Page title on the right */}
        <div className="flex-1 flex justify-end items-center min-w-0">
          <h1 className="text-lg font-semibold text-black truncate text-right">
            {pageTitle}
          </h1>
        </div>
      </div>
    </header>
  );
}
