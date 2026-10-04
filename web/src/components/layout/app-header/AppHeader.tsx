import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../ui/button/Button';
import Menu from '../../ui/menu/Menu';
import { MenuIcon } from '../../ui/icons/Icons';
import { useAuth } from '../../../context/AuthContext';
import { useT } from '../../../i18n';
import LanguageSelect from '../language-select/LanguageSelect';
import UserMenu from '../user-menu/UserMenu';
import './AppHeader.css';

const HOW_IT_WORKS_PATH = '/#como-funciona';

/** Barra global: logo, navegación, idioma y acceso o menú de usuario. */
const AppHeader: React.FC = () => {
  const { t } = useT();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const destinations = [
    { id: 'home', to: '/', label: t('nav.home') },
    { id: 'events', to: '/events', label: t('nav.events') },
    { id: 'how-it-works', to: HOW_IT_WORKS_PATH, label: t('nav.howItWorks') },
  ];

  return (
    <header className="ly-header">
      <div className="ly-header__inner">
        <div className="ly-header__brand">
          <span className="ly-header__menu-toggle">
            <Menu
              align="start"
              label={t('nav.mainNav')}
              trigger={
                <Button variant="icon" aria-label={t('nav.openMenu')} className="ly-header__menu-button">
                  <MenuIcon />
                </Button>
              }
              items={destinations.map((d) => ({
                id: d.id,
                label: d.label,
                onSelect: () => navigate(d.to),
              }))}
            />
          </span>
          <Link to="/" className="ly-header__logo">
            {t('common.appName')}
          </Link>
        </div>

        <nav aria-label={t('nav.mainNav')} className="ly-header__links">
          {destinations.map((d) => (
            <Link key={d.id} to={d.to} className="ly-header__link">
              {d.label}
            </Link>
          ))}
        </nav>

        {!loading && (
          <div className="ly-header__actions">
            {user ? (
              <>
                <span data-slot="notifications" className="ly-header__slot--notifications" />
                <UserMenu />
              </>
            ) : (
              <>
                <LanguageSelect />
                <Link to="/login" className="ui-button ui-button--sm ui-button--on-band ly-header__auth-link">
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="ui-button ui-button--sm ui-button--on-band ly-header__auth-link">
                  {t('nav.register')}
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
