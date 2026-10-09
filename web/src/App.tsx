import React, { JSX } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AppLayout from './components/layout/app-layout/AppLayout';
import RequireAuth from './components/layout/require-auth/RequireAuth';
import RedirectIfAuthenticated from './components/layout/redirect-if-authenticated/RedirectIfAuthenticated';
import LoginPage from './pages/login/LoginPage';
import RegisterPage from './pages/register/RegisterPage';
import ForgotPasswordPage from './pages/forgot-password/ForgotPasswordPage';
import CompleteProfilePage from './pages/complete-profile/CompleteProfilePage';
import NotFoundPage from './pages/not-found/NotFoundPage';
import { I18nProvider } from './i18n';
import EventDetailPage from './pages/event-detail/EventDetailPage';
import CreateEventPage from './pages/create-event/CreateEventPage';
import ManageEventPage from './pages/manage-event/ManageEventPage';
import HomePage from './pages/home/HomePage';
import EventsListPage from './pages/events-list/EventsListPage';
import MyEventsPage from './pages/my-events/MyEventsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import ResetPasswordPage from './pages/reset-password/ResetPasswordPage';
import { AuthProvider } from './context/AuthContext';
import { RUNTIME_CONFIG } from './config/runtime';

// Importar utilidades de testing en desarrollo
if (process.env.NODE_ENV === 'development') {
  import('./utils/testData.js');
}

// Rutas de la app (sin router ni providers, para poder probarlas)
export function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/events" element={<EventsListPage />} />
        <Route path="/my-events" element={<RequireAuth><MyEventsPage /></RequireAuth>} />
        <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
        <Route path="/events/create" element={<RequireAuth><CreateEventPage /></RequireAuth>} />
        <Route path="/events/:eventId/manage" element={<RequireAuth><ManageEventPage /></RequireAuth>} />
        <Route path="/events/:eventId" element={<EventDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      {/* Páginas de autenticación: layout propio, sin barra global ni pie */}
      <Route path="/login" element={<RedirectIfAuthenticated><LoginPage /></RedirectIfAuthenticated>} />
      <Route path="/register" element={<RedirectIfAuthenticated><RegisterPage /></RedirectIfAuthenticated>} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/complete-profile" element={<CompleteProfilePage />} />
    </Routes>
  );
}

function App(): JSX.Element {
  return (
    <I18nProvider>
      <GoogleOAuthProvider clientId={RUNTIME_CONFIG.GOOGLE_CLIENT_ID}>
        <AuthProvider>
          <BrowserRouter>
            <div className="App">
              <AppRoutes />
            </div>
          </BrowserRouter>
        </AuthProvider>
      </GoogleOAuthProvider>
    </I18nProvider>
  );
}

export default App;
