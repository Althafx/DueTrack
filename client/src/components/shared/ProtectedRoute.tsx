import { Navigate, Outlet } from "react-router-dom";
import type { Role } from "@shared/types";
import { useCurrentUser } from "@/hooks/useAuth";
import { LoadingState } from "@/components/shared/LoadingState";

export function ProtectedRoute({ allow }: { allow: Role[] }) {
  const { data: user, isLoading, isError } = useCurrentUser();

  if (isLoading) {
    return <LoadingState label="Checking your session..." className="min-h-screen" />;
  }

  if (isError || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allow.includes(user.role)) {
    return <Navigate to={user.role === "DEALER" ? "/dashboard" : "/employee/dashboard"} replace />;
  }

  return <Outlet />;
}
