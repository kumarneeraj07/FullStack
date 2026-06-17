import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * Guards routes that require authentication. Unauthenticated users are
 * redirected to /login, preserving where they were trying to go.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="loader">Loading...</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
