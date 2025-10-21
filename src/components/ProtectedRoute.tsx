import { Navigate, Outlet } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { useMe } from "@/hooks/useAuth";
import ProtectedLayout from "@/layouts/ProtectedLayout";

export default function ProtectedRoute() {
  const { data, error, isLoading } = useMe();

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

  return (
    <ProtectedLayout>
      <Outlet />
    </ProtectedLayout>
  );
}
