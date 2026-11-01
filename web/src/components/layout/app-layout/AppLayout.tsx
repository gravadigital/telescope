import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { NotificationsProvider } from '../../../context/NotificationsContext';
import { useT } from '../../../i18n';
import { GitHubIcon, TelescopeLogo } from '../../ui/icons/Icons';
import '../../ui/visually-hidden.css';
import AppHeader from '../app-header/AppHeader';
import './AppLayout.css';

/** Chrome global: barra, contenido de la ruta y pie. */
const AppLayout: React.FC = () => {
  const { t } = useT();
  const { user } = useAuth();

  const layout = (
    <div className="ly-layout">
      <AppHeader />
      <main id="main" className="ly-layout__main">
        <Outlet />
      </main>
      <footer className="ly-footer">
        <div className="ly-footer__inner">
          <div className="ly-footer__brand">
            <Link to="/" className="ly-footer__logo">
              <TelescopeLogo className="ly-footer__logo-mark" />
              <span className="ui-visually-hidden">{t('common.appName')}</span>
            </Link>
            <span className="ly-footer__version">{t('footer.version')}</span>
          </div>

          <a
            className="ly-footer__github"
            href="https://github.com/gravadigital/telescope"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GitHubIcon className="ly-footer__github-icon" />
            <span className="ly-footer__github-text">
              <span>{t('footer.github')}</span>
              <span className="ly-footer__repo">{t('footer.repo')}</span>
            </span>
          </a>

          <div className="ly-footer__contact">
            <span className="ly-footer__eyebrow">{t('footer.contact')}</span>
            <a href="mailto:info@grava.digital">{t('footer.email')}</a>
            <a href="tel:+5491130942020">{t('footer.phone')}</a>
          </div>
        </div>
      </footer>
    </div>
  );

  // El contador y su polling existen solo con sesión (S-018).
  return user ? <NotificationsProvider>{layout}</NotificationsProvider> : layout;
};

export default AppLayout;
