import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { loginPathFor } from '../../../domain/redirect';

interface RequireAuthProps {
  children: React.ReactElement;
}

/** Protege una ruta: espera a que se restaure la sesión y, sin usuario, va a `/login?next=`. */
const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) {
    return <Navigate to={loginPathFor(location.pathname + location.search)} replace />;
  }
  return children;
};

export default RequireAuth;
