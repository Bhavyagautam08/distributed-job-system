import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute() {
  const { user, loading, error } = useAuth();

  if (loading) {
    return <main className="auth-loading">Checking your session…</main>;
  }
  if (error) {
    return <main className="auth-loading" role="alert">{error}</main>;
  }
  return user ? <Outlet /> : <Navigate to="/auth" replace />;
}
