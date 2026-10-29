import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ToastContainer } from './store/toast.store';
import { ProtectedRoute } from './components/ProtectedRoute';
import { BackButton } from './components/BackButton';
import { NavigationTracker } from './components/NavigationTracker';

import HomePage from './pages/HomePage';
import CategoriesPage from './pages/CategoriesPage';
import DonationsPage from './pages/DonationsPage';
import DonationDetailsPage from './pages/DonationDetailsPage';
import CreateDonationPage from './pages/CreateDonationPage';
import MyDonationsPage from './pages/MyDonationsPage';
import FavoritesPage from './pages/FavoritesPage';
import MyRequestsPage from './pages/MyRequestsPage';
import IncomingRequestsPage from './pages/IncomingRequestsPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';
import { ADMIN_URL } from './admin/urls';

function RedirectToAdmin() {
  window.location.replace(ADMIN_URL);
  return null;
}

function SiteLayout() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <Navbar />
      <main className="flex-1">
        {pathname !== '/' && (
          <div className="mx-auto max-w-[1600px] px-4 pt-5 sm:px-6 lg:px-8">
            <BackButton />
          </div>
        )}
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <>
      <NavigationTracker />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/donations" element={<DonationsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/favorites" element={
            <ProtectedRoute><FavoritesPage /></ProtectedRoute>
          } />
          <Route path="/donations/new" element={
            <ProtectedRoute><CreateDonationPage /></ProtectedRoute>
          } />
          <Route path="/donations/:id/edit" element={
            <ProtectedRoute><CreateDonationPage /></ProtectedRoute>
          } />
          <Route path="/donations/:id" element={<DonationDetailsPage />} />
          <Route path="/my-donations" element={
            <ProtectedRoute><MyDonationsPage /></ProtectedRoute>
          } />
          <Route path="/my-requests" element={
            <ProtectedRoute><MyRequestsPage /></ProtectedRoute>
          } />
          <Route path="/incoming-requests" element={
            <ProtectedRoute><IncomingRequestsPage /></ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute><NotificationsPage /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* The admin panel is a separate app at its own address. */}
        <Route path="/admin/*" element={<RedirectToAdmin />} />
      </Routes>
      <ToastContainer />
    </>
  );
}
