import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { WorkspaceSwitcher } from "@/components/organism/WorkspaceSwitcher";

/**
 * Maps route pathname to page title
 */
function getPageTitle(pathname: string, t: TFunction): string {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return t("navigation.pageTitles.dashboard");
  }
  if (pathname === "/label" || pathname.startsWith("/label/")) {
    return t("navigation.pageTitles.labels");
  }
  if (pathname === "/job/new") {
    return t("navigation.pageTitles.newOperation");
  }
  if (pathname === "/job" || pathname.startsWith("/job/")) {
    return t("navigation.pageTitles.operations");
  }
  if (pathname === "/operations" || pathname.startsWith("/operations/")) {
    return t("navigation.pageTitles.qdc");
  }
  if (pathname === "/company" || pathname.startsWith("/company/")) {
    return t("navigation.pageTitles.companies");
  }
  if (pathname === "/fields" || pathname.startsWith("/fields/")) {
    return t("navigation.pageTitles.fields");
  }
  if (
    pathname === "/production-unit" ||
    pathname.startsWith("/production-unit/")
  ) {
    return t("navigation.pageTitles.productionUnits");
  }
  if (pathname === "/products" || pathname.startsWith("/products/")) {
    return t("navigation.pageTitles.warehouse");
  }
  if (pathname === "/settings") {
    return t("navigation.pageTitles.settings");
  }
  if (pathname === "/new-workspace") {
    return t("navigation.pageTitles.newWorkspace");
  }
  if (pathname.startsWith("/workspace/settings")) {
    return t("navigation.pageTitles.workspaceSettings");
  }
  if (pathname === "/new-label") {
    return t("navigation.pageTitles.newLabel");
  }
  if (pathname === "/new-production-unit") {
    return t("navigation.pageTitles.newProductionUnit");
  }
  if (pathname === "/create-company-field-production") {
    return t("navigation.pageTitles.quickCreate");
  }
  if (pathname === "/new-rule") {
    return t("navigation.pageTitles.newRule");
  }
  if (pathname.startsWith("/workspace/settings/rules/")) {
    return t("navigation.pageTitles.editRule");
  }

  return t("navigation.pageTitles.seminai");
}

/**
 * Mobile header component that shows workspace logo on the left
 * and current page title on the right
 */
export function MobileHeader(): React.ReactElement {
  const location = useLocation();
  const { t } = useTranslation();

  const pageTitle = getPageTitle(location.pathname, t);

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
