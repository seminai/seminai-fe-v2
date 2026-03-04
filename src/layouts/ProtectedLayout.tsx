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
import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  Droplet,
  Layers,
  LayoutDashboard,
  Map,
  MessageCircle,
  NotebookPen,
  Plug,
  Settings2,
  Sprout,
  Tags,
  Warehouse,
} from "lucide-react";
import { useMe } from "@/hooks/useAuth";
import { UserRole } from "@/api/auth";
import { WorkspaceSwitcher } from "@/components/organism/WorkspaceSwitcher";
import { MobileHeader } from "@/components/organism/MobileHeader";
import { useUserId } from "@/contexts/UserIdContext";
import {
  getScopedStorageItem,
  setScopedStorageItem,
} from "@/utils/storageKeys";

type ProtectedLayoutProps = {
  children: React.ReactNode;
};

type MobileBottomBarProps = {
  items: NavigationItem[];
  isMobile: boolean;
  manageVisibility: ManageMenuVisibility;
  fieldNotesVisible: boolean;
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
    // BASIC can see everything INCLUDING Labels (read-only)
    return true;
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
  operations: boolean;
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

class SidebarIconRegistry {
  public getDashboardIcon(): ManageMenuIcon {
    return LayoutDashboard;
  }

  public getLabelsIcon(): ManageMenuIcon {
    return Tags;
  }

  public getDosageIcon(): ManageMenuIcon {
    return Droplet;
  }

  public getCheckOperationsIcon(): ManageMenuIcon {
    return CheckCircle2;
  }

  public getFieldNotesIcon(): ManageMenuIcon {
    return NotebookPen;
  }

  public getManageIcon(): ManageMenuIcon {
    return Settings2;
  }

  public getCompanyIcon(): ManageMenuIcon {
    return Building2;
  }

  public getFieldsIcon(): ManageMenuIcon {
    return Map;
  }

  public getProductionUnitIcon(): ManageMenuIcon {
    return Sprout;
  }

  public getProductsIcon(): ManageMenuIcon {
    return Warehouse;
  }

  public getOperationsIcon(): ManageMenuIcon {
    return ClipboardCheck;
  }
}

class ManageMenuController {
  private readonly visibility: ManageMenuVisibility;
  private readonly items: ManageMenuItemConfig[];

  constructor(visibility: ManageMenuVisibility, icons: SidebarIconRegistry) {
    this.visibility = visibility;
    this.items = [
      {
        key: "company",
        label: "Aziende",
        path: "/company",
        icon: icons.getCompanyIcon(),
      },
      {
        key: "fields",
        label: "Campi",
        path: "/fields",
        icon: icons.getFieldsIcon(),
      },
      {
        key: "productionUnit",
        label: "Unità Produttive",
        path: "/production-unit",
        icon: icons.getProductionUnitIcon(),
      },
      {
        key: "products",
        label: "Magazzino",
        path: "/products",
        icon: icons.getProductsIcon(),
      },
      {
        key: "operations",
        label: "Qdca",
        path: "/operations",
        icon: icons.getOperationsIcon(),
      },
    ];
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

const sidebarIcons = new SidebarIconRegistry();

function MobileBottomBar({
  isMobile,
  userRole,
  manageVisibility,
  fieldNotesVisible,
}: MobileBottomBarProps) {
  if (!isMobile) return null;

  const labelActive = location.pathname.startsWith("/label");
  const labelDashboard = location.pathname.startsWith("/dashboard");
  const chatActive = location.pathname.startsWith("/dosage-agent-chat");
  const fieldsActive = location.pathname.startsWith("/fields");
  const companyActive = location.pathname.startsWith("/company");
  const productionUnitActive = location.pathname.startsWith("/production-unit");
  const jobActive = location.pathname.startsWith("/job");
  const productsActive = location.pathname.startsWith("/products");
  const fieldNotesActive = location.pathname.startsWith("/field-notes");

  const hasManageItems =
    Object.values(manageVisibility).some(Boolean) || fieldNotesVisible;

  const isManageActive =
    companyActive ||
    fieldsActive ||
    productionUnitActive ||
    productsActive ||
    jobActive ||
    fieldNotesActive;

  return (
    <nav
      data-mobile-bottom-bar="true"
      className="fixed bottom-0 left-0 right-0 z-20 mx-auto mb-safe w-full max-w-screen-sm"
    >
      <div className="m-3 rounded-2xl backdrop-blur-xl bg-white/20 supports-backdrop-blur:bg-white/30 border border-white/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_8px_32px_0_rgba(31,38,135,0.2)]">
        <ul className="flex items-center justify-center gap-1">
          {canViewMenuItem("dashboard", userRole) && (
            <li key="dashboard">
              <Link
                to="/dashboard"
                className={cn(
                  "flex flex-col items-center justify-center p-2.5 text-[11px] text-gray-800/80",
                  labelDashboard && "text-gray-900 font-medium",
                )}
              >
                <LayoutDashboard
                  className={cn(
                    "size-5",
                    labelDashboard ? "text-gray-900" : "text-gray-700/90",
                  )}
                  size={20}
                />
                <span className="mt-1">Home</span>
              </Link>
            </li>
          )}
          {userRole === UserRole.ADMIN && (
            <li key="chat">
              <Link
                to="/dosage-agent-chat"
                className={cn(
                  "flex flex-col items-center justify-center p-2.5 text-[11px] text-gray-800/80",
                  chatActive && "text-gray-900 font-medium",
                )}
              >
                <MessageCircle
                  className={cn(
                    "size-5",
                    chatActive ? "text-gray-900" : "text-gray-700/90",
                  )}
                  size={20}
                />
                <span className="mt-1">Chat</span>
              </Link>
            </li>
          )}
          {canViewMenuItem("label", userRole) && (
            <li key="label" className="">
              <Link
                to="/label"
                className={cn(
                  "flex flex-col items-center justify-center p-2.5 text-[11px] text-gray-800/80",
                  labelActive && "text-gray-900 font-medium",
                )}
              >
                <Tags
                  className={cn(
                    "size-5",
                    labelActive ? "text-gray-900" : "text-gray-700/90",
                  )}
                  size={20}
                />
                <span className="mt-1">Etichette</span>
              </Link>
            </li>
          )}
          {/* Genera Dosaggi rimosso dalla bottom bar mobile - accessibile da Operazioni > Aggiungi */}
          {hasManageItems && (
            <MobileManageMenu
              isActive={isManageActive}
              manageVisibility={manageVisibility}
              fieldNotesVisible={fieldNotesVisible}
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
  fieldNotesVisible,
}: {
  manageVisibility: ManageMenuVisibility;
  isActive: boolean;
  fieldNotesVisible: boolean;
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
              isActive && "text-gray-900 font-medium",
            )}
          >
            <Settings2
              className={cn(
                "size-5",
                isActive ? "text-gray-900" : "text-gray-700/90",
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
              <ClipboardCheck className="size-4 mr-2" size={16} />
              Operazioni
            </DropdownMenuItem>
          )}
          {manageVisibility.company && (
            <DropdownMenuItem onClick={() => navigate("/company")}>
              <Building2 className="size-4 mr-2" size={16} />
              Aziende
            </DropdownMenuItem>
          )}
          {manageVisibility.fields && (
            <DropdownMenuItem onClick={() => navigate("/fields")}>
              <Map className="size-4 mr-2" size={16} />
              Campi
            </DropdownMenuItem>
          )}
          {manageVisibility.productionUnit && (
            <DropdownMenuItem onClick={() => navigate("/production-unit")}>
              <Sprout className="size-4 mr-2" size={16} />
              Unità Produttive
            </DropdownMenuItem>
          )}
          {manageVisibility.products && (
            <DropdownMenuItem onClick={() => navigate("/products")}>
              <Warehouse className="size-4 mr-2" size={16} />
              Magazzino
            </DropdownMenuItem>
          )}
          {fieldNotesVisible && (
            <DropdownMenuItem onClick={() => navigate("/field-notes")}>
              <NotebookPen className="size-4 mr-2" />
              Note di Campo
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
              "flex w-full flex-col items-center justify-center p-2.5 text-[11px] text-gray-800/80",
            )}
          >
            <IoPersonCircleOutline className="size-5 text-gray-700/90" />
            <span className="mt-1">Account</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="center">
          <DropdownMenuLabel>Il mio account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => navigate("/settings?tab=impostazioni")}
          >
            <LuSettings className="size-4" /> Impostazioni
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/settings?tab=integrazioni")}
          >
            <Plug className="size-4" /> Integrazioni
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/settings?tab=costi")}>
            <Coins className="size-4" /> Costi
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
        "flex cursor-pointer h-9 w-9 items-center justify-center transition rounded-lg hover:bg-neutral-100/50",
        className,
      )}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-slate-500"
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
const TOOLS_MENU_STATE_KEY = "tools-menu-open-state";

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
  const userId = useUserId();
  const userRole = meData?.role;

  // Gestione stato sidebar con localStorage
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    try {
      const stored = getScopedStorageItem(SIDEBAR_STATE_KEY, userId);
      return stored ? (JSON.parse(stored) as boolean) : false;
    } catch {
      return false;
    }
  });

  // Gestione stato menu "Gestisci" con localStorage
  const [manageMenuOpen, setManageMenuOpen] = useState<boolean>(() => {
    try {
      const stored = getScopedStorageItem(MANAGE_MENU_STATE_KEY, userId);
      return stored ? (JSON.parse(stored) as boolean) : true;
    } catch {
      return true;
    }
  });

  // Gestione stato menu "Strumenti" con localStorage
  const [toolsMenuOpen, setToolsMenuOpen] = useState<boolean>(() => {
    try {
      const stored = getScopedStorageItem(TOOLS_MENU_STATE_KEY, userId);
      return stored ? (JSON.parse(stored) as boolean) : true;
    } catch {
      return true;
    }
  });
  useEffect(() => {
    setScopedStorageItem(
      SIDEBAR_STATE_KEY,
      userId,
      JSON.stringify(sidebarOpen),
    );
  }, [sidebarOpen, userId]);

  useEffect(() => {
    setScopedStorageItem(
      MANAGE_MENU_STATE_KEY,
      userId,
      JSON.stringify(manageMenuOpen),
    );
  }, [manageMenuOpen, userId]);

  useEffect(() => {
    setScopedStorageItem(
      TOOLS_MENU_STATE_KEY,
      userId,
      JSON.stringify(toolsMenuOpen),
    );
  }, [toolsMenuOpen, userId]);

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
      operations:
        menuAvailability.allowJobsMenu &&
        canViewMenuItem("operations", userRole),
    }),
    [
      userRole,
      menuAvailability.allowFieldsMenu,
      menuAvailability.allowProductionUnitMenu,
      menuAvailability.allowProductsMenu,
      menuAvailability.allowJobsMenu,
    ],
  );
  const jobVisible = manageVisibility.jobs;
  const fieldNotesVisible = canViewMenuItem("field-notes", userRole);
  const manageMenuController = useMemo(
    () => new ManageMenuController(manageVisibility, sidebarIcons),
    [manageVisibility],
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
  const jobActive =
    location.pathname === "/job" || location.pathname.startsWith("/job/");
  const fieldNotesActive =
    location.pathname === "/field-notes" ||
    location.pathname.startsWith("/field-notes/");
  const productsActive =
    location.pathname === "/products" ||
    location.pathname.startsWith("/products/");
  const operationsActive =
    location.pathname === "/operations" ||
    location.pathname.startsWith("/operations/");
  const dosageAgentChatActive = location.pathname === "/dosage-agent-chat";

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <Sidebar
        variant="floating"
        collapsible="icon"
        className="bg-transparent py-4"
        innerClassName="backdrop-blur-lg bg-agri-green-50 border border-neutral-200/50 shadow-sm"
      >
        <SidebarHeader className="px-4 pt-4 pb-2">
          <div className="flex w-full flex-col gap-2">
            <WorkspaceSwitcher collapsed={!sidebarOpen} />
            {!isMobile && (
              <div className="flex justify-center group-data-[collapsible=icon]:mt-2">
                <SidebarToggleButton
                  isOpen={sidebarOpen}
                  onToggle={handleSidebarToggle}
                />
              </div>
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
                        <LayoutDashboard className="size-5" size={20} />
                        <span className="group-data-[collapsible=icon]:hidden">
                          Dashboard
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {/* Menu Strumenti - solo in modalità espansa */}
                {sidebarOpen &&
                  (canViewMenuItem("label", userRole) ||
                    jobVisible ||
                    fieldNotesVisible ||
                    userRole === UserRole.ADMIN) && (
                    <Collapsible
                      open={toolsMenuOpen}
                      onOpenChange={setToolsMenuOpen}
                      className="group/tools-collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip="Strumenti"
                            size="lg"
                            className="data-[active=true]:bg-neutral-900/5 py-3 px-3 text-[15px]"
                          >
                            <Layers className="size-5" size={20} />
                            <span>Strumenti</span>
                            <IoChevronDownOutline
                              className={cn(
                                "ml-auto size-4 transition-transform",
                                toolsMenuOpen && "rotate-180",
                              )}
                            />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenu className="pl-2 border-l-2 border-neutral-200/50 ml-6 mt-2 gap-1">
                            {canViewMenuItem("label", userRole) && (
                              <SidebarMenuItem key="label">
                                <SidebarMenuButton
                                  asChild
                                  isActive={labelActive}
                                  tooltip="Etichette"
                                  size="lg"
                                  className="data-[active=true]:bg-neutral-900/5 py-2.5 px-3 text-[14px]"
                                >
                                  <Link
                                    to="/label"
                                    className="flex items-center gap-3"
                                  >
                                    <Tags className="size-5" size={20} />
                                    <span>Etichette</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )}
                            {jobVisible && (
                              <SidebarMenuItem key="job">
                                <SidebarMenuButton
                                  asChild
                                  isActive={jobActive}
                                  tooltip="Operazioni"
                                  size="lg"
                                  className="data-[active=true]:bg-neutral-900/5 py-2.5 px-3 text-[14px]"
                                >
                                  <Link
                                    to="/job"
                                    className="flex items-center gap-3"
                                  >
                                    <CheckCircle2
                                      className="size-5"
                                      size={20}
                                    />
                                    <span>Operazioni</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )}
                            {fieldNotesVisible && (
                              <SidebarMenuItem key="field-notes">
                                <SidebarMenuButton
                                  asChild
                                  isActive={fieldNotesActive}
                                  tooltip="Note di Campo"
                                  size="lg"
                                  className="data-[active=true]:bg-neutral-900/5 py-2.5 px-3 text-[14px]"
                                >
                                  <Link
                                    to="/field-notes"
                                    className="flex items-center gap-3"
                                  >
                                    <NotebookPen className="size-5" />
                                    <span>Note di Campo</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )}
                            {userRole === UserRole.ADMIN && (
                              <SidebarMenuItem key="chat">
                                <SidebarMenuButton
                                  asChild
                                  isActive={dosageAgentChatActive}
                                  tooltip="Chat"
                                  size="lg"
                                  className="data-[active=true]:bg-neutral-900/5 py-2.5 px-3 text-[14px]"
                                >
                                  <Link
                                    to="/dosage-agent-chat"
                                    className="flex items-center gap-3"
                                  >
                                    <MessageCircle
                                      className="size-5"
                                      size={20}
                                    />
                                    <span>Chat</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )}
                          </SidebarMenu>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )}

                {/* Menu Gestisci - solo in modalità espansa */}
                {sidebarOpen &&
                  (manageVisibility.company ||
                    manageVisibility.fields ||
                    manageVisibility.productionUnit ||
                    manageVisibility.products ||
                    manageVisibility.operations) && (
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
                            <Settings2 className="size-5" size={20} />
                            <span>Gestisci</span>
                            <IoChevronDownOutline
                              className={cn(
                                "ml-auto size-4 transition-transform",
                                manageMenuOpen && "rotate-180",
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
                                    <Building2 className="size-5" size={20} />
                                    <span>Aziende</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )}{" "}
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
                                    <Map className="size-5" size={20} />
                                    <span>Campi</span>
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
                                    <Sprout className="size-5" size={20} />
                                    <span>Unità Produttive</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )}
                            {manageVisibility.products && (
                              <SidebarMenuItem key="products">
                                <SidebarMenuButton
                                  asChild
                                  isActive={productsActive}
                                  tooltip="Magazzino"
                                  size="lg"
                                  className="data-[active=true]:bg-neutral-900/5 py-2.5 px-3 text-[14px]"
                                >
                                  <Link
                                    to="/products"
                                    className="flex items-center gap-3"
                                  >
                                    <Warehouse className="size-5" size={20} />
                                    <span>Magazzino</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )}
                            {manageVisibility.operations && (
                              <SidebarMenuItem key="operations">
                                <SidebarMenuButton
                                  asChild
                                  isActive={operationsActive}
                                  tooltip="Qdca"
                                  size="lg"
                                  className="data-[active=true]:bg-neutral-900/5 py-2.5 px-3 text-[14px]"
                                >
                                  <Link
                                    to="/operations"
                                    className="flex items-center gap-3"
                                  >
                                    <ClipboardCheck
                                      className="size-5"
                                      size={20}
                                    />
                                    <span>Qdca</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )}
                          </SidebarMenu>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )}

                {/* Strumenti raggruppati - icona collassata con dropdown */}
                {!sidebarOpen &&
                  (canViewMenuItem("label", userRole) ||
                    jobVisible ||
                    fieldNotesVisible ||
                    userRole === UserRole.ADMIN) && (
                    <SidebarMenuItem key="tools-collapsed">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuButton
                            type="button"
                            tooltip="Strumenti"
                            size="lg"
                            className={cn(
                              "data-[state=open]:bg-neutral-900/5",
                              (labelActive ||
                                jobActive ||
                                fieldNotesActive ||
                                dosageAgentChatActive) &&
                                "bg-neutral-900/5",
                            )}
                          >
                            <Layers className="size-5" size={20} />
                          </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          side="right"
                          align="start"
                          className="min-w-[220px]"
                        >
                          <DropdownMenuLabel>Strumenti</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {canViewMenuItem("label", userRole) && (
                            <DropdownMenuItem
                              onClick={() => navigate("/label")}
                            >
                              <Tags className="size-4 mr-2" size={16} />
                              Etichette
                            </DropdownMenuItem>
                          )}
                          {jobVisible && (
                            <DropdownMenuItem onClick={() => navigate("/job")}>
                              <CheckCircle2 className="size-4 mr-2" size={16} />
                              Operazioni
                            </DropdownMenuItem>
                          )}
                          {fieldNotesVisible && (
                            <DropdownMenuItem
                              onClick={() => navigate("/field-notes")}
                            >
                              <NotebookPen className="size-4 mr-2" size={16} />
                              Note di Campo
                            </DropdownMenuItem>
                          )}
                          {userRole === UserRole.ADMIN && (
                            <DropdownMenuItem
                              onClick={() => navigate("/dosage-agent-chat")}
                            >
                              <MessageCircle
                                className="size-4 mr-2"
                                size={16}
                              />
                              Chat
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                          <Settings2 className="size-5" size={20} />
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
                          ),
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
                <DropdownMenuItem
                  onClick={() => navigate("/settings?tab=impostazioni")}
                >
                  <LuSettings /> Impostazioni
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/settings?tab=integrazioni")}
                >
                  <Plug className="size-4" /> Integrazioni
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/settings?tab=costi")}
                >
                  <Coins className="size-4" /> Costi
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
      <SidebarInset className="overflow-hidden max-h-svh">
        <MobileHeader />
        <div className="h-full w-full flex flex-col overflow-hidden pb-24 lg:pb-0 md:pt-0 pt-14">
          <main className="flex-1 min-h-0 w-full overflow-auto">
            {children}
          </main>
          <MobileBottomBar
            items={items}
            isMobile={isMobile}
            manageVisibility={manageVisibility}
            fieldNotesVisible={fieldNotesVisible}
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
