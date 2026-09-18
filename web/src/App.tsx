import React, { JSX, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './App.css';
import Events from './components/events/Events';
import Auth from './components/auth/Auth';
import Modal from './components/modal/Modal';
import EventDetailPage from './pages/event-detail/EventDetailPage';
import CreateEventPage from './pages/create-event/CreateEventPage';
import ManageEventPage from './pages/manage-event/ManageEventPage';
import ResetPasswordPage from './pages/reset-password/ResetPasswordPage';
import { AuthProvider, useAuth } from './context/AuthContext';

// Importar utilidades de testing en desarrollo
if (process.env.NODE_ENV === 'development') {
  import('./utils/testData.js');
}

type AuthAction = 'login' | 'register' | 'logout';

// Home Page Component
function HomePage(): JSX.Element {
  return (
    <main className="main-content">
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
    </main>
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
          console.log('🔄 Redirecting organizer to manage page');
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

// Main App Content with Navigation
function AppContent(): JSX.Element {
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const { user, logout, isAuthenticated, registerAuthModalHandler } = useAuth();

  const handleAuthAction = (action: AuthAction): void => {
    if (action === 'logout') {
      logout();
    } else {
      setAuthMode(action);
      setShowAuthModal(true);
    }
  };

  // Register the auth modal handler in the context
  React.useEffect(() => {
    if (registerAuthModalHandler) {
      registerAuthModalHandler((mode: 'login' | 'register') => {
        setAuthMode(mode);
        setShowAuthModal(true);
      });
    }
  }, [registerAuthModalHandler]);

  return (
    <div className="App">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <h2 style={{ cursor: 'pointer' }}>TELESCOPIO</h2>
            </Link>
          </div>
          <div className="nav-menu">
            <Link to="/" className="nav-link">About</Link>
            <Link to="/" className="nav-link">See Demo</Link>
            <Link to="/events" className="nav-link">Events</Link>

            {isAuthenticated ? (
              <>
                <span className="user-greeting">Hello, {user?.name}</span>
                <button onClick={() => handleAuthAction('logout')} className="nav-link nav-button">Logout</button>
              </>
            ) : (
              <>
                <button onClick={() => handleAuthAction('register')} className="nav-link nav-button">Register</button>
                <button onClick={() => handleAuthAction('login')} className="nav-link nav-button">Login</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Routes */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/create" element={<CreateEventPage />} />
        <Route path="/events/:eventId/manage" element={<ManageEventPage />} />
        <Route path="/events/:eventId" element={<EventDetailPageWrapper />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>

      {showAuthModal && (
        <Modal onClose={() => setShowAuthModal(false)}>
          <Auth initialMode={authMode} onClose={() => setShowAuthModal(false)} />
        </Modal>
      )}
    </div>
  );
}

function App(): JSX.Element {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || ''}>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
