import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from './ui/spinner';

interface PublicRouteProps {
  children: React.ReactNode;
  redirectAuthenticated?: boolean;
}

export default function PublicRoute({
  children,
  redirectAuthenticated = true,
}: PublicRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <Spinner className="w-8 h-8 text-[#c3f53b]" />
      </div>
    );
  }

  // Redirect authenticated users away from auth pages to dashboard
  if (redirectAuthenticated && isAuthenticated) {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    return <Navigate to={from || '/dashboard'} replace />;
  }

  return <>{children}</>;
}
