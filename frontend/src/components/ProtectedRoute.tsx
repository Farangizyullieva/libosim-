import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { Loader } from './Feedback';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuthStore();
  const location = useLocation();

  if (isInitializing) return <Loader />;

  if (!isAuthenticated) {
    return <Navigate to="/register" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
