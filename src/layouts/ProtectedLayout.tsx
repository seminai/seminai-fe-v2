import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import { NavigationModel, NavigationItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  IoHomeOutline,
  IoPersonCircleOutline,
  IoPricetagOutline,
  IoGridOutline,
  IoBusinessOutline,
  IoChevronForwardOutline,
  IoChevronBackOutline,
  IoChevronDownOutline,
  IoStatsChartOutline,
  IoLeafOutline,
  IoCalculatorOutline,
  IoCubeOutline,
} from "react-icons/io5";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCompanies } from "@/hooks/useCompanies";
import authService from "@/utils/auth";
import { LuLogOut, LuSettings } from "react-icons/lu";

type ProtectedLayoutProps = {
  children: React.ReactNode;
};

type MobileBottomBarProps = {
  items: NavigationItem[];
  isMobile: boolean;
  hasCompanies: boolean;
  isActive: (item: NavigationItem) => boolean;
  hrefFor: (item: NavigationItem) => string;
};

function MobileBottomBar({ isMobile, hasCompanies }: MobileBottomBarProps) {
  if (!isMobile) return null;

  const labelActive = location.pathname.startsWith("/label");
  const labelDashboard = location.pathname.startsWith("/dashboard");
  const fieldsActive = location.pathname.startsWith("/fields");
  // const companyActive = location.pathname.startsWith("/company");
  const productionUnitActive = location.pathname.startsWith("/production-unit");
  const dosageManagerActive = location.pathname.startsWith("/dosage-manager");
  const productsActive = location.pathname.startsWith("/products");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 mx-auto mb-safe w-full max-w-screen-sm">
      <div className="m-3 rounded-2xl backdrop-blur-xl bg-white/20 supports-backdrop-blur:bg-white/30 border border-white/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_8px_32px_0_rgba(31,38,135,0.2)]">
        <ul className="flex items-center justify-center gap-1">
          <li key="dashboard">
            <Link
              to="/dashboard"
              className={cn(
                "flex flex-col items-center justify-center p-2.5 text-[11px] text-gray-800/80",
                labelDashboard && "text-gray-900 font-medium"
              )}
            >
              <IoHomeOutline
                className={cn(
                  "size-5",
                  labelDashboard ? "text-gray-900" : "text-gray-700/90"
                )}
              />
              <span className="mt-1">Home</span>
            </Link>
          </li>
          <li key="label" className="">
            <Link
              to="/label"
              className={cn(
                "flex flex-col items-center justify-center p-2.5 text-[11px] text-gray-800/80",
                labelActive && "text-gray-900 font-medium"
              )}
            >
              <IoPricetagOutline
                className={cn(
                  "size-5",
                  labelActive ? "text-gray-900" : "text-gray-700/90"
                )}
              />
              <span className="mt-1">Etichette</span>
            </Link>
          </li>
          {hasCompanies && (
            <li key="fields">
              <Link
                to="/fields"
                className={cn(
                  "flex flex-col items-center justify-center p-2.5 text-[11px] text-gray-800/80",
                  fieldsActive && "text-gray-900 font-medium"
                )}
              >
                <IoGridOutline
                  className={cn(
                    "size-5",
                    fieldsActive ? "text-gray-900" : "text-gray-700/90"
                  )}
                />
                <span className="mt-1">Campi</span>
              </Link>
            </li>
          )}
          {hasCompanies && (
            <li key="production-unit">
              <Link
                to="/production-unit"
                className={cn(
                  "flex flex-col items-center justify-center p-2.5 text-[11px] text-gray-800/80",
                  productionUnitActive && "text-gray-900 font-medium"
                )}
              >
                <IoLeafOutline
                  className={cn(
                    "size-5",
                    productionUnitActive ? "text-gray-900" : "text-gray-700/90"
                  )}
                />
                <span className="mt-1">Unità Prod.</span>
              </Link>
            </li>
          )}
          {hasCompanies && (
            <li key="dosage-manager">
              <Link
                to="/dosage-manager"
                className={cn(
                  "flex flex-col items-center justify-center p-2.5 text-[11px] text-gray-800/80",
                  dosageManagerActive && "text-gray-900 font-medium"
                )}
              >
                <IoCalculatorOutline
                  className={cn(
                    "size-5",
                    dosageManagerActive ? "text-gray-900" : "text-gray-700/90"
                  )}
                />
                <span className="mt-1">Dosaggi</span>
              </Link>
            </li>
          )}
          {hasCompanies && (
            <li key="products">
              <Link
                to="/products"
                className={cn(
                  "flex flex-col items-center justify-center p-2.5 text-[11px] text-gray-800/80",
                  productsActive && "text-gray-900 font-medium"
                )}
              >
                <IoCubeOutline
                  className={cn(
                    "size-5",
                    productsActive ? "text-gray-900" : "text-gray-700/90"
                  )}
                />
                <span className="mt-1">Prodotti</span>
              </Link>
            </li>
          )}
          <MobileAccountMenu />
        </ul>
      </div>
    </nav>
  );
}

function MobileAccountMenu() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return (
    <li key="account" className="">
      <DropdownMenu>
        <DropdownMenuTrigger className="w-full" asChild>
          <button
            type="button"
            className={cn(
              "flex w-full flex-col items-center justify-center p-3 text-[11px] text-gray-800/80"
            )}
          >
            <IoPersonCircleOutline className="size-6 text-gray-700/90" />
            <span className="mt-1">Account</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="center">
          <DropdownMenuLabel>Il mio account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/settings")}>
            Impostazioni
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={async () => {
              try {
                // Esegui il logout (chiama backend + cancella cookie client)
                await authService.logout();

                // Pulisci la cache di React Query
                queryClient.removeQueries({
                  queryKey: ["auth", "me"],
                  exact: false,
                });
                queryClient.removeQueries({
                  queryKey: ["users", "me"],
                  exact: false,
                });

                // Forza un hard reload per assicurarsi che tutto sia pulito
                // Questo resetta completamente lo stato dell'app
                window.location.href = "/auth";
              } catch (error) {
                console.error("Logout error:", error);
                // Anche in caso di errore, forza il redirect
                window.location.href = "/auth";
              }
            }}
          >
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

const SIDEBAR_STATE_KEY = "sidebar-open-state";
const MANAGE_MENU_STATE_KEY = "manage-menu-open-state";

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data } = useCurrentUser();
  const { companies } = useCompanies();
  const queryClient = useQueryClient();

  // Gestione stato sidebar con localStorage
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
    return stored ? JSON.parse(stored) : false;
  });

  // Gestione stato menu "Gestisci" con localStorage
  const [manageMenuOpen, setManageMenuOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem(MANAGE_MENU_STATE_KEY);
    return stored ? JSON.parse(stored) : true; // aperto di default
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    localStorage.setItem(MANAGE_MENU_STATE_KEY, JSON.stringify(manageMenuOpen));
  }, [manageMenuOpen]);

  const model = new NavigationModel("/dashboard");
  const items = model.getNavigationItems();

  const hasCompanies = companies.length > 0;

  const labelActive =
    location.pathname === "/label" || location.pathname.startsWith("/label/");
  const labelDashboard =
    location.pathname === "/dashboard" ||
    location.pathname.startsWith("/dashboard/");
  const fieldsActive =
    location.pathname === "/fields" || location.pathname.startsWith("/fields/");
  const companyActive =
    location.pathname === "/company" ||
    location.pathname.startsWith("/company/");
  const productionUnitActive =
    location.pathname === "/production-unit" ||
    location.pathname.startsWith("/production-unit/");
  const dosageManagerActive =
    location.pathname === "/dosage-manager" ||
    location.pathname.startsWith("/dosage-manager/");
  const productsActive =
    location.pathname === "/products" ||
    location.pathname.startsWith("/products/");

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <Sidebar
        variant="floating"
        collapsible="icon"
        className="bg-transparent py-4"
        innerClassName="backdrop-blur-lg bg-white/0 border border-neutral-200/50 shadow-sm"
      >
        <SidebarHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-center group-data-[collapsible=icon]:justify-center">
            <img src="/logo.png" alt="logo" className="h-8 w-8" />
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2">
          <SidebarGroup className="py-2">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                <SidebarMenuItem key="dashboard">
                  <SidebarMenuButton
                    asChild
                    isActive={labelDashboard}
                    tooltip="Dashboard"
                    size="lg"
                    className="data-[active=true]:bg-neutral-900/5 py-3 px-3 text-[15px]"
                  >
                    <Link to="/dashboard" className="flex items-center gap-3">
                      <IoHomeOutline className="size-5" />
                      <span className="group-data-[collapsible=icon]:hidden">
                        Dashboard
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem key="label">
                  <SidebarMenuButton
                    asChild
                    isActive={labelActive}
                    tooltip="Etichette"
                    size="lg"
                    className="data-[active=true]:bg-neutral-900/5 py-3 px-3 text-[15px]"
                  >
                    <Link to="/label" className="flex items-center gap-3">
                      <IoPricetagOutline className="size-5" />
                      <span className="group-data-[collapsible=icon]:hidden">
                        Etichette
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {hasCompanies && (
                  <SidebarMenuItem
                    key="dosage-manager"
                    className="group-data-[collapsible=icon]:hidden"
                  >
                    <SidebarMenuButton
                      asChild
                      isActive={dosageManagerActive}
                      tooltip="Gestione Dosaggi"
                      size="lg"
                      className="data-[active=true]:bg-neutral-900/5 py-3 px-3 text-[15px]"
                    >
                      <Link
                        to="/dosage-manager"
                        className="flex items-center gap-3"
                      >
                        <IoCalculatorOutline className="size-5" />
                        <span className="group-data-[collapsible=icon]:hidden">
                          Gestione Dosaggi
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {/* Modalità espansa: mostra menu collapsible */}
                <Collapsible
                  open={manageMenuOpen}
                  onOpenChange={setManageMenuOpen}
                  className="group/collapsible group-data-[collapsible=icon]:hidden"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip="Gestisci"
                        size="lg"
                        className="data-[active=true]:bg-neutral-900/5 py-3 px-3 text-[15px]"
                      >
                        <IoStatsChartOutline className="size-5" />
                        <span>Gestisci</span>
                        <IoChevronDownOutline
                          className={cn(
                            "ml-auto size-4 transition-transform",
                            manageMenuOpen && "rotate-180"
                          )}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenu className="pl-2 border-l-2 border-neutral-200/50 ml-6 mt-2 gap-1">
                        <SidebarMenuItem key="company">
                          <SidebarMenuButton
                            asChild
                            isActive={companyActive}
                            tooltip="Aziende"
                            size="lg"
                            className="data-[active=true]:bg-neutral-900/5 py-2.5 px-3 text-[14px]"
                          >
                            <Link
                              to="/company"
                              className="flex items-center gap-3"
                            >
                              <IoBusinessOutline className="size-5" />
                              <span>Aziende</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>

                        {hasCompanies && (
                          <SidebarMenuItem key="fields">
                            <SidebarMenuButton
                              asChild
                              isActive={fieldsActive}
                              tooltip="Campi"
                              size="lg"
                              className="data-[active=true]:bg-neutral-900/5 py-2.5 px-3 text-[14px]"
                            >
                              <Link
                                to="/fields"
                                className="flex items-center gap-3"
                              >
                                <IoGridOutline className="size-5" />
                                <span>Campi</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}

                        {hasCompanies && (
                          <SidebarMenuItem key="production-unit">
                            <SidebarMenuButton
                              asChild
                              isActive={productionUnitActive}
                              tooltip="Unità Produttive"
                              size="lg"
                              className="data-[active=true]:bg-neutral-900/5 py-2.5 px-3 text-[14px]"
                            >
                              <Link
                                to="/production-unit"
                                className="flex items-center gap-3"
                              >
                                <IoLeafOutline className="size-5" />
                                <span>Unità Produttive</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}

                        {hasCompanies && (
                          <SidebarMenuItem key="products">
                            <SidebarMenuButton
                              asChild
                              isActive={productsActive}
                              tooltip="Prodotti"
                              size="lg"
                              className="data-[active=true]:bg-neutral-900/5 py-2.5 px-3 text-[14px]"
                            >
                              <Link
                                to="/products"
                                className="flex items-center gap-3"
                              >
                                <IoCubeOutline className="size-5" />
                                <span>Prodotti</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                      </SidebarMenu>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>

                {/* Modalità collassata: mostra icone separate */}
                <SidebarMenuItem
                  key="company-icon"
                  className="hidden group-data-[collapsible=icon]:block"
                >
                  <SidebarMenuButton
                    asChild
                    isActive={companyActive}
                    tooltip="Aziende"
                    size="lg"
                    className="data-[active=true]:bg-neutral-900/5"
                  >
                    <Link to="/company" className="flex items-center gap-3">
                      <IoBusinessOutline className="size-5" />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {hasCompanies && (
                  <SidebarMenuItem
                    key="fields-icon"
                    className="hidden group-data-[collapsible=icon]:block"
                  >
                    <SidebarMenuButton
                      asChild
                      isActive={fieldsActive}
                      tooltip="Campi"
                      size="lg"
                      className="data-[active=true]:bg-neutral-900/5"
                    >
                      <Link to="/fields" className="flex items-center gap-3">
                        <IoGridOutline className="size-5" />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {hasCompanies && (
                  <SidebarMenuItem
                    key="production-unit-icon"
                    className="hidden group-data-[collapsible=icon]:block"
                  >
                    <SidebarMenuButton
                      asChild
                      isActive={productionUnitActive}
                      tooltip="Unità Produttive"
                      size="lg"
                      className="data-[active=true]:bg-neutral-900/5"
                    >
                      <Link
                        to="/production-unit"
                        className="flex items-center gap-3"
                      >
                        <IoLeafOutline className="size-5" />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {hasCompanies && (
                  <SidebarMenuItem
                    key="products-icon"
                    className="hidden group-data-[collapsible=icon]:block"
                  >
                    <SidebarMenuButton
                      asChild
                      isActive={productsActive}
                      tooltip="Prodotti"
                      size="lg"
                      className="data-[active=true]:bg-neutral-900/5"
                    >
                      <Link to="/products" className="flex items-center gap-3">
                        <IoCubeOutline className="size-5" />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <div className="px-4 pb-20">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-10 w-full items-center justify-center rounded-lg hover:bg-neutral-100/50 transition-colors"
          >
            {sidebarOpen ? (
              <IoChevronBackOutline className="size-5 text-neutral-700" />
            ) : (
              <IoChevronForwardOutline className="size-5 text-neutral-700" />
            )}
          </button>
        </div>
        <SidebarFooter className="pb-4 px-4">
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-3 w-full rounded-xl p-2 hover:bg-neutral-100/50 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-300">
                <Avatar className="size-9">
                  <AvatarImage
                    src={data?.data.user.profilePictureUrl}
                    alt={`${data?.data.user.name ?? ""} ${
                      data?.data.user.surname ?? ""
                    }`}
                  />
                  <AvatarFallback>
                    {(data?.data.user.name?.[0] ?? "").toUpperCase()}
                    {(data?.data.user.surname?.[0] ?? "").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left group-data-[collapsible=icon]:hidden">
                  <span className="text-sm font-medium text-neutral-900">
                    {data?.data.user.name} {data?.data.user.surname}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {data?.data.user.email}
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start">
                <DropdownMenuLabel>Il mio account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <LuSettings /> Impostazioni
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={async () => {
                    try {
                      // Esegui il logout (chiama backend + cancella cookie client)
                      await authService.logout();

                      // Pulisci la cache di React Query
                      queryClient.removeQueries({
                        queryKey: ["auth", "me"],
                        exact: false,
                      });
                      queryClient.removeQueries({
                        queryKey: ["users", "me"],
                        exact: false,
                      });

                      // Forza un hard reload per assicurarsi che tutto sia pulito
                      window.location.href = "/auth";
                    } catch (error) {
                      console.error("Logout error:", error);
                      // Anche in caso di errore, forza il redirect
                      window.location.href = "/auth";
                    }
                  }}
                  className="cursor-pointer  text-red-600"
                >
                  <LuLogOut /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="overflow-hidden">
        <div className="h-svh w-full overflow-hidden flex flex-col">
          {children}
          <MobileBottomBar
            items={items}
            isMobile={isMobile}
            hasCompanies={hasCompanies}
            isActive={(i) =>
              model.isActive(location.pathname, location.search, i)
            }
            hrefFor={(i) => model.getItemHref(i)}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
