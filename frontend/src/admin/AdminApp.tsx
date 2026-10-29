import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { ToastContainer } from '../store/toast.store';
import { Loader } from '../components/Feedback';
import { AdminShell } from './AdminShell';
import AdminLoginPage from './AdminLoginPage';
import AdminSettingsPage from './AdminSettingsPage';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminDonationsPage from '../pages/admin/AdminDonationsPage';
import AdminCategoriesPage from '../pages/admin/AdminCategoriesPage';
import AdminUsersPage from '../pages/admin/AdminUsersPage';

// Only signed-in admins get past this; everyone else lands on the admin
// login page of this separate app.
function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isInitializing } = useAuthStore();
  const location = useLocation();
  if (isInitializing) return <Loader />;
  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}

export default function AdminApp() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<AdminLoginPage />} />
        <Route
          element={
            <RequireAdmin>
              <AdminShell />
            </RequireAdmin>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="donations" element={<AdminDonationsPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}
