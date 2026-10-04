import React, { JSX } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './App.css';
import Events from './components/events/Events';
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
import ResetPasswordPage from './pages/reset-password/ResetPasswordPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RUNTIME_CONFIG } from './config/runtime';

// Importar utilidades de testing en desarrollo
if (process.env.NODE_ENV === 'development') {
  import('./utils/testData.js');
}

// Home Page Component
function HomePage(): JSX.Element {
  return (
    <div className="main-content">
      {/* Section 1: WHY? */}
      <section id="why" className="section">
        <div className="section-container">
          <h1 className="section-title">WHY?</h1>
          <div className="section-content">
            <p>This is the WHY section where we explain the purpose and motivation behind Telescopio.</p>
          </div>
        </div>
      </section>

      {/* Section 2: HOW? */}
      <section id="how" className="section">
        <div className="section-container">
          <h1 className="section-title">HOW?</h1>
          <div className="section-content">
            <p>This is the HOW section where we explain the process and methodology of Telescopio.</p>
          </div>
        </div>
      </section>

      {/* Section 3: DEMO */}
      <section id="demo" className="section">
        <div className="section-container">
          <h1 className="section-title">DEMO</h1>
          <div className="section-content">
            <p>This is the DEMO section where we showcase the capabilities of Telescopio.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

// Events List Page Component
function EventsPage(): JSX.Element {
  const navigate = useNavigate();

  const handleViewEventDetail = (eventId: string): void => {
    navigate(`/events/${eventId}`);
  };

  return <Events onViewEventDetail={handleViewEventDetail} />;
}

// Event Detail Page Wrapper Component
function EventDetailPageWrapper(): JSX.Element {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isCheckingOwnership, setIsCheckingOwnership] = React.useState(true);

  // Check if user is the event owner and redirect to manage page
  React.useEffect(() => {
    const checkOwnership = async () => {
      if (!eventId) return;
      
      try {
        // Dynamically import EventService to check event ownership
        const { EventService } = await import('./services/api');
        const event = await EventService.getEventById(eventId);
        
        if (event && user && event.creator_id === user.id) {
          // User is the creator, redirect to manage page
          navigate(`/events/${eventId}/manage`, { replace: true });
          return;
        }
      } catch (error) {
        console.error('Error checking event ownership:', error);
      } finally {
        setIsCheckingOwnership(false);
      }
    };

    checkOwnership();
  }, [eventId, user, navigate]);

  const handleBack = (): void => {
    navigate('/events');
  };

  if (!eventId) {
    return <div>Event not found</div>;
  }

  if (isCheckingOwnership) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return <EventDetailPage eventId={eventId} onBack={handleBack} />;
}

// Rutas de la app (sin router ni providers, para poder probarlas)
export function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/create" element={<RequireAuth><CreateEventPage /></RequireAuth>} />
        <Route path="/events/:eventId/manage" element={<RequireAuth><ManageEventPage /></RequireAuth>} />
        <Route path="/events/:eventId" element={<EventDetailPageWrapper />} />
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
