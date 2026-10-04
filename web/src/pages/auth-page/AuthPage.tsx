import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Auth from '../../components/auth/Auth';
import { safeNextPath } from '../../domain/redirect';
import './AuthPage.css';

interface AuthPageProps {
  mode: 'login' | 'register';
}

/**
 * Página provisoria de acceso (hasta S-012): el formulario actual dentro del layout.
 * Tras autenticarse vuelve a `next` si es una ruta interna; si no, a `/events`.
 */
const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');

  return (
    <div className="ap-page">
      <Auth initialMode={mode} onClose={() => navigate(safeNextPath(next), { replace: true })} />
    </div>
  );
};

export default AuthPage;
