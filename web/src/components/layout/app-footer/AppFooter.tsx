import React from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../../i18n';
import './AppFooter.css';

/** Pie global: comparte la banda negra del header y enmarca la plataforma. */
const AppFooter: React.FC = () => {
  const { t } = useT();

  return (
    <footer className="ly-footer">
      <div className="ly-footer__inner">
        <Link to="/" className="ly-footer__brand">
          {t('common.appName')}
        </Link>
        <nav aria-label={t('footer.nav')} className="ly-footer__links">
          <Link to="/" className="ly-footer__link">
            {t('nav.home')}
          </Link>
          <Link to="/events" className="ly-footer__link">
            {t('nav.events')}
          </Link>
        </nav>
        <p className="ly-footer__text">{t('footer.tagline')}</p>
      </div>
    </footer>
  );
};

export default AppFooter;
