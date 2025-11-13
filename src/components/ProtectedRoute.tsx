import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { useMe } from "@/hooks/useAuth";
import ProtectedLayout from "@/layouts/ProtectedLayout";
import { UserRole } from "@/api/auth";

// Helper function to check if user can access a route
function canAccessRoute(pathname: string, userRole?: UserRole): boolean {
  if (!userRole) return false;
  
  if (userRole === UserRole.ADMIN) {
    return true; // ADMIN can access all routes
  }
  
  if (userRole === UserRole.LABEL_MANAGER) {
    // LABEL_MANAGER can ONLY access label routes and dashboard
    return pathname === "/dashboard" || 
           pathname.startsWith("/label") || 
           pathname === "/new-label" ||
           pathname === "/settings";
  }
  
  if (userRole === UserRole.BASIC) {
    // BASIC can access everything EXCEPT label routes
    return !pathname.startsWith("/label") && pathname !== "/new-label";
  }
  
  return false;
}

export default function ProtectedRoute() {
  const { data, error, isLoading } = useMe();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={48} ariaLabel="Caricamento" />
      </div>
    );
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
    <ProtectedLayout>
      <Outlet />
    </ProtectedLayout>
  );
}
