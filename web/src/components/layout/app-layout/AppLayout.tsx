import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { NotificationsProvider } from '../../../context/NotificationsContext';
import AppFooter from '../app-footer/AppFooter';
import AppHeader from '../app-header/AppHeader';
import './AppLayout.css';

/** Chrome global: barra, contenido de la ruta y pie. */
const AppLayout: React.FC = () => {
  const { user } = useAuth();

  const layout = (
    <div className="ly-layout">
      <AppHeader />
      <main id="main" className="ly-layout__main">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  );

  // El contador y su polling existen solo con sesión (S-018).
  return user ? <NotificationsProvider>{layout}</NotificationsProvider> : layout;
};

export default AppLayout;
