import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { safeNextPath } from '../../../domain/redirect';

interface RedirectIfAuthenticatedProps {
  children: React.ReactElement;
}

/** Inverso de `RequireAuth`: con sesión iniciada, `/login` y `/register` van a `next` (o a Eventos). */
const RedirectIfAuthenticated: React.FC<RedirectIfAuthenticatedProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();

  if (loading) return null;
  if (user) return <Navigate to={safeNextPath(searchParams.get('next'))} replace />;
  return children;
};

export default RedirectIfAuthenticated;
