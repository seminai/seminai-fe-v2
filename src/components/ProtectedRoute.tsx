import type { ReactElement } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useMe } from "@/hooks/useAuth";
import ProtectedLayout from "@/layouts/ProtectedLayout";
import { UserRole } from "@/api/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";

class ProtectedLayoutSkeletonRenderer {
  private readonly navigationItemsCount = 6;

  public render(): ReactElement {
    return (
      <div className="min-h-screen flex bg-neutral-50">
        {this.renderSidebar()}
        {this.renderContentArea()}
      </div>
    );
  }

  private renderSidebar(): ReactElement {
    return (
      <aside className="hidden lg:flex w-64 flex-col border-r border-neutral-200 bg-white/90 backdrop-blur-sm p-6 space-y-6">
        <Skeleton className="h-10 w-24 rounded-xl" />
        <div className="space-y-2">{this.renderNavigationSkeletons()}</div>
        <div className="mt-auto flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </aside>
    );
  }

  private renderNavigationSkeletons(): ReactElement[] {
    return Array.from({ length: this.navigationItemsCount }).map((_, index) => (
      <Skeleton key={`nav-skeleton-${index}`} className="h-10 w-full" />
    ));
  }

  private renderContentArea(): ReactElement {
    return (
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-neutral-200 bg-white/70 backdrop-blur-sm px-6 flex items-center">
          <Skeleton className="h-8 w-48" />
        </header>
        <main className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <Spinner
              size={64}
              ariaLabel="Caricamento area protetta"
              className="text-neutral-700"
            />
            <div className="space-y-2">
              <Skeleton className="h-4 w-64 mx-auto" />
              <Skeleton className="h-3 w-48 mx-auto" />
            </div>
          </div>
        </main>
      </div>
    );
  }
}

// Helper function to check if user can access a route
function canAccessRoute(pathname: string, userRole?: UserRole): boolean {
  if (!userRole) return false;

  if (userRole === UserRole.ADMIN) {
    return true; // ADMIN can access all routes
  }

  if (userRole === UserRole.LABEL_MANAGER) {
    // LABEL_MANAGER can ONLY access label routes and dashboard
    return (
      pathname === "/dashboard" ||
      pathname.startsWith("/label") ||
      pathname === "/new-label" ||
      pathname === "/settings"
    );
  }

  if (userRole === UserRole.BASIC) {
    // BASIC can access everything INCLUDING label routes (read-only)
    return true;
  }

  return false;
}

export default function ProtectedRoute() {
  const { data, error, isLoading } = useMe();
  const location = useLocation();
  const skeletonRenderer = new ProtectedLayoutSkeletonRenderer();

  if (isLoading) {
    return skeletonRenderer.render();
  }

  if (error || !data) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user has permission to access this route
  const userRole = data.role;
  const canAccess = canAccessRoute(location.pathname, userRole);

  if (!canAccess) {
    // Redirect to appropriate page based on role
    if (userRole === UserRole.LABEL_MANAGER) {
      return <Navigate to="/label" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <WorkspaceProvider>
      <ProtectedLayout>
        <Outlet />
      </ProtectedLayout>
    </WorkspaceProvider>
  );
}
