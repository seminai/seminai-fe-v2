import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo } from "react";
import type { ComponentType } from "react";
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
import { IoPersonCircleOutline, IoChevronDownOutline } from "react-icons/io5";
import HomeAgriIcon from "@/components/icons/HomeAgriIcon";
import TagAgriIcon from "@/components/icons/TagAgriIcon";
import SprayAgriIcon from "@/components/icons/SprayAgriIcon";
import TasksAgriIcon from "@/components/icons/TasksAgriIcon";
import ChartAgriIcon from "@/components/icons/ChartAgriIcon";
import BarnAgriIcon from "@/components/icons/BarnAgriIcon";
import FieldAgriIcon from "@/components/icons/FieldAgriIcon";
import PlantGrowAgriIcon from "@/components/icons/PlantGrowAgriIcon";
import BottleAgriIcon from "@/components/icons/BottleAgriIcon";
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
import { useFields } from "@/hooks/useFields";
import { useProductionUnit } from "@/hooks/useProductionUnit";
import authService from "@/utils/auth";
import { LuLogOut, LuSettings } from "react-icons/lu";
import { useMe } from "@/hooks/useAuth";
import { UserRole } from "@/api/auth";

type ProtectedLayoutProps = {
  children: React.ReactNode;
};

type MobileBottomBarProps = {
  items: NavigationItem[];
  isMobile: boolean;
  menuAvailability: MenuAvailabilityState;
  manageVisibility: ManageMenuVisibility;
  isActive: (item: NavigationItem) => boolean;
  hrefFor: (item: NavigationItem) => string;
  userRole?: UserRole;
};

// Helper function to check if a menu item should be visible based on user role
function canViewMenuItem(menuItem: string, userRole?: UserRole): boolean {
  if (!userRole) return false;

  if (userRole === UserRole.ADMIN) {
    return true; // ADMIN can see everything
  }

  if (userRole === UserRole.LABEL_MANAGER) {
    // LABEL_MANAGER can ONLY see Labels and Dashboard
    return menuItem === "label" || menuItem === "dashboard";
  }

  if (userRole === UserRole.BASIC) {
    // BASIC can see everything EXCEPT Labels
    return menuItem !== "label";
  }

  return false;
}

type VisibilityCounts = {
  companiesCount: number;
  fieldsCount: number;
  productionUnitsCount: number;
};

type MenuAvailabilityState = {
  hasCompanies: boolean;
  onlyCompanyButton: boolean;
  allowFieldsMenu: boolean;
  allowProductionUnitMenu: boolean;
  allowDosageManagerMenu: boolean;
  allowProductsMenu: boolean;
  allowJobsMenu: boolean;
};

type ManageMenuVisibility = {
  company: boolean;
  fields: boolean;
  productionUnit: boolean;
  products: boolean;
  jobs: boolean;
};

type ManageMenuKey = Exclude<keyof ManageMenuVisibility, "jobs">;

type SidebarToggleButtonProps = {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
};

class SidebarVisibilityRules {
  private readonly role?: UserRole;
  private readonly counts: VisibilityCounts;

  constructor(role: UserRole | undefined, counts: VisibilityCounts) {
    this.role = role;
    this.counts = counts;
  }

  private isRestrictedRole(): boolean {
    return this.role === UserRole.ADMIN || this.role === UserRole.BASIC;
  }

  private hasCompanies(): boolean {
    return this.counts.companiesCount > 0;
  }

  private hasFields(): boolean {
    return this.counts.fieldsCount > 0;
  }

  private hasProductionUnits(): boolean {
    return this.counts.productionUnitsCount > 0;
  }

  public buildAvailability(): MenuAvailabilityState {
    const hasCompanies = this.hasCompanies();
    const hasFields = this.hasFields();
    const hasProductionUnits = this.hasProductionUnits();
    const restrictedRole = this.isRestrictedRole();
    const onlyCompanyButton = restrictedRole && !hasCompanies;

    const allowFieldsMenu = hasCompanies && !onlyCompanyButton;
    const allowProductionUnitMenu =
      hasCompanies && !onlyCompanyButton && (!restrictedRole || hasFields);
    const allowDosageManagerMenu =
      hasCompanies &&
      !onlyCompanyButton &&
      (!restrictedRole || (hasFields && hasProductionUnits));
    const allowProductsMenu = allowDosageManagerMenu;
    const allowJobsMenu =
      hasCompanies &&
      !onlyCompanyButton &&
      (!restrictedRole || hasProductionUnits);

    return {
      hasCompanies,
      onlyCompanyButton,
      allowFieldsMenu,
      allowProductionUnitMenu,
      allowDosageManagerMenu,
      allowProductsMenu,
      allowJobsMenu,
    };
  }
}

type ManageMenuIconProps = {
  className?: string;
  size?: number;
};

type ManageMenuIcon = ComponentType<ManageMenuIconProps>;

type ManageMenuItemConfig = {
  key: ManageMenuKey;
  label: string;
  path: string;
  icon: ManageMenuIcon;
};

class ManageMenuController {
  private readonly visibility: ManageMenuVisibility;
  private readonly items: ManageMenuItemConfig[] = [
    {
      key: "company",
      label: "Aziende",
      path: "/company",
      icon: BarnAgriIcon,
    },
    {
      key: "fields",
      label: "Campi",
      path: "/fields",
      icon: FieldAgriIcon,
    },
    {
      key: "productionUnit",
      label: "Unità Produttive",
      path: "/production-unit",
      icon: PlantGrowAgriIcon,
    },
    {
      key: "products",
      label: "Prodotti",
      path: "/products",
      icon: BottleAgriIcon,
    },
  ];

  constructor(visibility: ManageMenuVisibility) {
    this.visibility = visibility;
  }

  public getVisibleItems(): ManageMenuItemConfig[] {
    return this.items.filter(({ key }) => this.visibility[key]);
  }
}

class SidebarToggleController {
  private readonly isOpen: boolean;

  constructor(isOpen: boolean) {
    this.isOpen = isOpen;
  }

  public getAriaLabel(): string {
    return this.isOpen ? "Collapse sidebar" : "Expand sidebar";
  }
}

function MobileBottomBar({
  isMobile,
  userRole,
  menuAvailability,
  manageVisibility,
}: MobileBottomBarProps) {
  if (!isMobile) return null;

  const labelActive = location.pathname.startsWith("/label");
  const labelDashboard = location.pathname.startsWith("/dashboard");
  const fieldsActive = location.pathname.startsWith("/fields");
  const companyActive = location.pathname.startsWith("/company");
  const productionUnitActive = location.pathname.startsWith("/production-unit");
  const dosageManagerActive = location.pathname.startsWith("/dosage-manager");
  const jobActive = location.pathname.startsWith("/job");
  const productsActive = location.pathname.startsWith("/products");

  const dosageManagerVisible =
    menuAvailability.allowDosageManagerMenu &&
    canViewMenuItem("dosage-manager", userRole);
  const hasManageItems = Object.values(manageVisibility).some(Boolean);

  const isManageActive =
    companyActive ||
    fieldsActive ||
    productionUnitActive ||
    productsActive ||
    jobActive;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 mx-auto mb-safe w-full max-w-screen-sm">
      <div className="m-3 rounded-2xl backdrop-blur-xl bg-white/20 supports-backdrop-blur:bg-white/30 border border-white/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_8px_32px_0_rgba(31,38,135,0.2)]">
        <ul className="flex items-center justify-center gap-1">
          {canViewMenuItem("dashboard", userRole) && (
            <li key="dashboard">
              <Link
                to="/dashboard"
                className={cn(
                  "flex flex-col items-center justify-center p-2.5 text-[11px] text-gray-800/80",
                  labelDashboard && "text-gray-900 font-medium"
                )}
              >
                <HomeAgriIcon
                  className={cn(
                    "size-5",
                    labelDashboard ? "text-gray-900" : "text-gray-700/90"
                  )}
                  size={20}
                />
                <span className="mt-1">Home</span>
              </Link>
            </li>
          )}
          {canViewMenuItem("label", userRole) && (
            <li key="label" className="">
              <Link
                to="/label"
                className={cn(
                  "flex flex-col items-center justify-center p-2.5 text-[11px] text-gray-800/80",
                  labelActive && "text-gray-900 font-medium"
                )}
              >
                <TagAgriIcon
                  className={cn(
                    "size-5",
                    labelActive ? "text-gray-900" : "text-gray-700/90"
                  )}
                  size={20}
                />
                <span className="mt-1">Etichette</span>
              </Link>
            </li>
          )}
          {dosageManagerVisible && (
            <li key="dosage-manager">
              <Link
                to="/dosage-manager"
                className={cn(
                  "flex flex-col items-center justify-center p-2.5 text-[11px] text-gray-800/80",
                  dosageManagerActive && "text-gray-900 font-medium"
                )}
              >
                <SprayAgriIcon
                  className={cn(
                    "size-5",
                    dosageManagerActive ? "text-gray-900" : "text-gray-700/90"
                  )}
                  size={20}
                />
                <span className="mt-1">Dosaggi</span>
              </Link>
            </li>
          )}
          {hasManageItems && (
            <MobileManageMenu
              isActive={isManageActive}
              manageVisibility={manageVisibility}
            />
          )}
          <MobileAccountMenu />
        </ul>
      </div>
    </nav>
  );
}

function MobileManageMenu({
  manageVisibility,
  isActive,
}: {
  manageVisibility: ManageMenuVisibility;
  isActive: boolean;
}) {
  const navigate = useNavigate();

  return (
    <li key="manage" className="">
      <DropdownMenu>
        <DropdownMenuTrigger className="w-full" asChild>
          <button
            type="button"
            className={cn(
              "flex w-full flex-col items-center justify-center p-2.5 text-[11px] text-gray-800/80",
              isActive && "text-gray-900 font-medium"
            )}
          >
            <ChartAgriIcon
              className={cn(
                "size-5",
                isActive ? "text-gray-900" : "text-gray-700/90"
              )}
              size={20}
            />
            <span className="mt-1">Gestisci</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="center"
          className="min-w-[180px]"
        >
          <DropdownMenuLabel>Gestisci</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {manageVisibility.jobs && (
            <DropdownMenuItem onClick={() => navigate("/job")}>
              <TasksAgriIcon className="size-4 mr-2" size={16} />
              Operazioni
            </DropdownMenuItem>
          )}
          {manageVisibility.company && (
            <DropdownMenuItem onClick={() => navigate("/company")}>
              <BarnAgriIcon className="size-4 mr-2" size={16} />
              Aziende
            </DropdownMenuItem>
          )}
          {manageVisibility.fields && (
            <DropdownMenuItem onClick={() => navigate("/fields")}>
              <FieldAgriIcon className="size-4 mr-2" size={16} />
              Campi
            </DropdownMenuItem>
          )}
          {manageVisibility.productionUnit && (
            <DropdownMenuItem onClick={() => navigate("/production-unit")}>
              <PlantGrowAgriIcon className="size-4 mr-2" size={16} />
              Unità Produttive
            </DropdownMenuItem>
          )}
          {manageVisibility.products && (
            <DropdownMenuItem onClick={() => navigate("/products")}>
              <BottleAgriIcon className="size-4 mr-2" size={16} />
              Prodotti
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
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
              "flex w-full flex-col items-center justify-center p-2.5 text-[11px] text-gray-800/80"
            )}
          >
            <IoPersonCircleOutline className="size-5 text-gray-700/90" />
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

function SidebarToggleButton({
  isOpen,
  onToggle,
  className,
}: SidebarToggleButtonProps) {
  const controller = new SidebarToggleController(isOpen);

  return (
    <button
      type="button"
      aria-label={controller.getAriaLabel()}
      aria-pressed={isOpen}
      title={controller.getAriaLabel()}
      onClick={onToggle}
      className={cn(
        "flex cursor-pointer h-9 w-9 items-center justify-center transition",
        // Quando aperto: posizionato a destra del logo
        "absolute right-0 top-1/2 -translate-y-1/2 translate-x-0",
        // Quando chiuso: posizionato sotto il logo
        "group-data-[collapsible=icon]:relative group-data-[collapsible=icon]:right-auto group-data-[collapsible=icon]:top-auto group-data-[collapsible=icon]:translate-y-0 group-data-[collapsible=icon]:translate-x-0 group-data-[collapsible=icon]:mt-2",
        className
      )}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-agri-green-600"
      >
        <rect
          x="2"
          y="3"
          width="12"
          height="10"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
        <line
          x1="6"
          y1="3"
          x2="6"
          y2="13"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    </button>
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
  const { fields } = useFields();
  const { productionUnits } = useProductionUnit();
  const queryClient = useQueryClient();
  const { data: meData } = useMe();
  const userRole = meData?.role;

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

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, [setSidebarOpen]);
  const model = new NavigationModel("/dashboard");
  const items = model.getNavigationItems();

  const visibilityRules = new SidebarVisibilityRules(userRole, {
    companiesCount: companies.length,
    fieldsCount: fields.length,
    productionUnitsCount: productionUnits.length,
  });
  const menuAvailability = visibilityRules.buildAvailability();
  const manageVisibility = useMemo<ManageMenuVisibility>(
    () => ({
      company: canViewMenuItem("company", userRole),
      fields:
        menuAvailability.allowFieldsMenu && canViewMenuItem("fields", userRole),
      productionUnit:
        menuAvailability.allowProductionUnitMenu &&
        canViewMenuItem("production-unit", userRole),
      products:
        menuAvailability.allowProductsMenu &&
        canViewMenuItem("products", userRole),
      jobs: menuAvailability.allowJobsMenu && canViewMenuItem("job", userRole),
    }),
    [
      userRole,
      menuAvailability.allowFieldsMenu,
      menuAvailability.allowProductionUnitMenu,
      menuAvailability.allowProductsMenu,
      menuAvailability.allowJobsMenu,
    ]
  );
  const dosageManagerVisible =
    menuAvailability.allowDosageManagerMenu &&
    canViewMenuItem("dosage-manager", userRole);
  const jobVisible = manageVisibility.jobs;
  const manageMenuController = useMemo(
    () => new ManageMenuController(manageVisibility),
    [manageVisibility]
  );
  const manageMenuItems = manageMenuController.getVisibleItems();
  const hasManageItems = manageMenuItems.length > 0;

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
  const jobActive =
    location.pathname === "/job" || location.pathname.startsWith("/job/");
  const productsActive =
    location.pathname === "/products" ||
    location.pathname.startsWith("/products/");

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <Sidebar
        variant="floating"
        collapsible="icon"
        className="bg-transparent py-4"
        innerClassName="backdrop-blur-lg bg-agri-green-50 border border-neutral-200/50 shadow-sm"
      >
        <SidebarHeader className="px-4 pt-4 pb-2">
          <div className="relative flex w-full flex-col items-center justify-center py-1 group-data-[collapsible=icon]:gap-0">
            <img src="/logo.png" alt="logo" className="h-8 w-8" />
            {!isMobile && (
              <SidebarToggleButton
                isOpen={sidebarOpen}
                onToggle={handleSidebarToggle}
              />
            )}
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2">
          <SidebarGroup className="py-2">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {/* Dashboard */}
                {canViewMenuItem("dashboard", userRole) && (
                  <SidebarMenuItem key="dashboard">
                    <SidebarMenuButton
                      asChild
                      isActive={labelDashboard}
                      tooltip="Dashboard"
                      size="lg"
                      className="data-[active=true]:bg-neutral-900/5 py-3 px-3 text-[15px]"
                    >
                      <Link to="/dashboard" className="flex items-center gap-3">
                        <HomeAgriIcon className="size-5" size={20} />
                        <span className="group-data-[collapsible=icon]:hidden">
                          Dashboard
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {/* Etichette */}
                {canViewMenuItem("label", userRole) && (
                  <SidebarMenuItem key="label">
                    <SidebarMenuButton
                      asChild
                      isActive={labelActive}
                      tooltip="Etichette"
                      size="lg"
                      className="data-[active=true]:bg-neutral-900/5 py-3 px-3 text-[15px]"
                    >
                      <Link to="/label" className="flex items-center gap-3">
                        <TagAgriIcon className="size-5" size={20} />
                        <span className="group-data-[collapsible=icon]:hidden">
                          Etichette
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {/* Gestione Dosaggi - solo in modalità espansa */}
                {dosageManagerVisible && sidebarOpen && (
                  <SidebarMenuItem key="dosage-manager-expanded">
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
                        <SprayAgriIcon className="size-5" size={20} />
                        <span>Gestione Dosaggi</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {/* Operazioni - solo in modalità espansa */}
                {jobVisible && sidebarOpen && (
                  <SidebarMenuItem key="job-expanded">
                    <SidebarMenuButton
                      asChild
                      isActive={jobActive}
                      tooltip="Operazioni"
                      size="lg"
                      className="data-[active=true]:bg-neutral-900/5 py-3 px-3 text-[15px]"
                    >
                      <Link to="/job" className="flex items-center gap-3">
                        <TasksAgriIcon className="size-5" size={20} />
                        <span>Operazioni</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {/* Menu Gestisci - solo in modalità espansa */}
                {sidebarOpen &&
                  (manageVisibility.company ||
                    manageVisibility.fields ||
                    manageVisibility.productionUnit ||
                    manageVisibility.products) && (
                    <Collapsible
                      open={manageMenuOpen}
                      onOpenChange={setManageMenuOpen}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip="Gestisci"
                            size="lg"
                            className="data-[active=true]:bg-neutral-900/5 py-3 px-3 text-[15px]"
                          >
                            <ChartAgriIcon className="size-5" size={20} />
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
                            {manageVisibility.company && (
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
                                    <BarnAgriIcon
                                      className="size-5"
                                      size={20}
                                    />
                                    <span>Aziende</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )}

                            {manageVisibility.productionUnit && (
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
                                    <PlantGrowAgriIcon
                                      className="size-5"
                                      size={20}
                                    />
                                    <span>Unità Produttive</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )}

                            {manageVisibility.fields && (
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
                                    <FieldAgriIcon
                                      className="size-5"
                                      size={20}
                                    />
                                    <span>Campi</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )}

                            {manageVisibility.products && (
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
                                    <BottleAgriIcon
                                      className="size-5"
                                      size={20}
                                    />
                                    <span>Prodotti</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )}
                          </SidebarMenu>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )}

                {/* ICONE IN MODALITÀ COLLASSATA - Solo queste si vedono quando la sidebar è chiusa */}

                {/* Gestione Dosaggi - icona collassata */}
                {dosageManagerVisible && !sidebarOpen && (
                  <SidebarMenuItem key="dosage-manager-collapsed">
                    <SidebarMenuButton
                      asChild
                      isActive={dosageManagerActive}
                      tooltip="Gestione Dosaggi"
                      size="lg"
                      className="data-[active=true]:bg-neutral-900/5"
                    >
                      <Link
                        to="/dosage-manager"
                        className="flex items-center gap-3"
                      >
                        <SprayAgriIcon className="size-5" size={20} />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {/* Operazioni - icona collassata */}
                {jobVisible && !sidebarOpen && (
                  <SidebarMenuItem key="job-collapsed">
                    <SidebarMenuButton
                      asChild
                      isActive={jobActive}
                      tooltip="Operazioni"
                      size="lg"
                      className="data-[active=true]:bg-neutral-900/5"
                    >
                      <Link to="/job" className="flex items-center gap-3">
                        <TasksAgriIcon className="size-5" size={20} />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {/* Gestisci - icona collassata */}
                {!sidebarOpen && hasManageItems && (
                  <SidebarMenuItem key="manage-collapsed">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                          type="button"
                          tooltip="Gestisci"
                          size="lg"
                          className="data-[state=open]:bg-neutral-900/5"
                        >
                          <ChartAgriIcon className="size-5" size={20} />
                        </SidebarMenuButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side="right"
                        align="start"
                        className="min-w-[220px]"
                      >
                        <DropdownMenuLabel>Gestisci</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {manageMenuItems.map(
                          ({ key, label, icon: Icon, path }) => (
                            <DropdownMenuItem
                              key={key}
                              onClick={() => navigate(path)}
                            >
                              <Icon className="size-4 mr-2" size={16} />
                              {label}
                            </DropdownMenuItem>
                          )
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

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
                <div className="flex flex-col items-start text-left group-data-[collapsible=icon]:hidden min-w-0 flex-1">
                  <span className="text-sm font-medium text-neutral-900 truncate w-full">
                    {data?.data.user.name} {data?.data.user.surname}
                  </span>
                  <span className="text-xs text-neutral-500 truncate w-full">
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
      <SidebarInset className="overflow-x-hidden">
        <div className="min-h-svh w-full flex flex-col overflow-x-hidden pb-24 lg:pb-0">
          <main className="flex-1 w-full">{children}</main>
          <MobileBottomBar
            items={items}
            isMobile={isMobile}
            menuAvailability={menuAvailability}
            manageVisibility={manageVisibility}
            isActive={(i) =>
              model.isActive(location.pathname, location.search, i)
            }
            hrefFor={(i) => model.getItemHref(i)}
            userRole={userRole}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
