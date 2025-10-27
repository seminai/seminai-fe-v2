import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
import authService from "@/utils/auth";
import { LuLogOut, LuSettings } from "react-icons/lu";

type ProtectedLayoutProps = {
  children: React.ReactNode;
};

type MobileBottomBarProps = {
  items: NavigationItem[];
  isMobile: boolean;
  isActive: (item: NavigationItem) => boolean;
  hrefFor: (item: NavigationItem) => string;
};

function MobileBottomBar({ isMobile }: MobileBottomBarProps) {
  if (!isMobile) return null;

  const labelActive = location.pathname.startsWith("/label");
  const labelDashboard = location.pathname.startsWith("/dashboard");
  const fieldsActive = location.pathname.startsWith("/fields");
  const companyActive = location.pathname.startsWith("/company");

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
          <li key="company">
            <Link
              to="/company"
              className={cn(
                "flex flex-col items-center justify-center p-2.5 text-[11px] text-gray-800/80",
                companyActive && "text-gray-900 font-medium"
              )}
            >
              <IoBusinessOutline
                className={cn(
                  "size-5",
                  companyActive ? "text-gray-900" : "text-gray-700/90"
                )}
              />
              <span className="mt-1">Aziende</span>
            </Link>
          </li>
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
            onClick={() => {
              authService.logout();
              queryClient.removeQueries({
                queryKey: ["auth", "me"],
                exact: false,
              });
              queryClient.removeQueries({
                queryKey: ["users", "me"],
                exact: false,
              });
              navigate("/auth", { replace: true });
            }}
          >
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data } = useCurrentUser();
  const queryClient = useQueryClient();

  const model = new NavigationModel("/dashboard");
  const items = model.getNavigationItems();

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

  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar
        variant="floating"
        collapsible="icon"
        // inset-y-auto top-1/2 -translate-y-1/2 h-[50svh]
        className="bg-transparent py-4"
        innerClassName="backdrop-blur-lg bg-white/0 border border-neutral-200/50 shadow-sm"
      >
        <SidebarHeader className="px-2 pt-2">
          <div className="flex items-center justify-center">
            <img src="/logo.png" alt="logo" className="h-7 w-7" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {" "}
                <SidebarMenuItem key="dashboard">
                  <SidebarMenuButton
                    asChild
                    isActive={labelDashboard}
                    tooltip="Dashboard"
                    className="data-[active=true]:bg-neutral-900/5"
                  >
                    <Link to="/dashboard" className="flex items-center gap-2">
                      <IoHomeOutline className="size-6" />
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
                    className="data-[active=true]:bg-neutral-900/5"
                  >
                    <Link to="/label" className="flex items-center gap-2">
                      <IoPricetagOutline className="size-6" />
                      <span className="group-data-[collapsible=icon]:hidden">
                        Etichette
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem key="fields">
                  <SidebarMenuButton
                    asChild
                    isActive={fieldsActive}
                    tooltip="Campi"
                    className="data-[active=true]:bg-neutral-900/5"
                  >
                    <Link to="/fields" className="flex items-center gap-2">
                      <IoGridOutline className="size-6" />
                      <span className="group-data-[collapsible=icon]:hidden">
                        Campi
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem key="company">
                  <SidebarMenuButton
                    asChild
                    isActive={companyActive}
                    tooltip="Aziende"
                    className="data-[active=true]:bg-neutral-900/5"
                  >
                    <Link to="/company" className="flex items-center gap-2">
                      <IoBusinessOutline className="size-6" />
                      <span className="group-data-[collapsible=icon]:hidden">
                        Aziende
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="pb-4">
          <div className="px-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-neutral-300">
                <Avatar className="size-8">
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
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start">
                <DropdownMenuLabel>Il mio account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <LuSettings /> Impostazioni
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    authService.logout();
                    queryClient.removeQueries({
                      queryKey: ["auth", "me"],
                      exact: false,
                    });
                    queryClient.removeQueries({
                      queryKey: ["users", "me"],
                      exact: false,
                    });
                    navigate("/auth", { replace: true });
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

      <SidebarInset>
        <div className="min-h-svh w-full">
          {children}
          <MobileBottomBar
            items={items}
            isMobile={isMobile}
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
