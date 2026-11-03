import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner } from './ui.jsx';

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Checking your session…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

// Login and register pages bounce signed-in users back to the app.
export function GuestRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Spinner label="Checking your session…" />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}
