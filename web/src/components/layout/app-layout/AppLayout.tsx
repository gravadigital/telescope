import React from 'react';
import { Outlet } from 'react-router-dom';
import { useT } from '../../../i18n';
import AppHeader from '../app-header/AppHeader';
import './AppLayout.css';

/** Chrome global: barra, contenido de la ruta y pie. */
const AppLayout: React.FC = () => {
  const { t } = useT();

  return (
    <div className="ly-layout">
      <AppHeader />
      <main id="main" className="ly-layout__main">
        <Outlet />
      </main>
      <footer className="ly-footer">
        <p className="ly-footer__text">{t('footer.tagline')}</p>
      </footer>
    </div>
  );
};

export default AppLayout;
