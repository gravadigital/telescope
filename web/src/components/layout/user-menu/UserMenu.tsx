import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../ui/button/Button';
import Menu from '../../ui/menu/Menu';
import { useAuth } from '../../../context/AuthContext';
import { useT } from '../../../i18n';
import { initials } from './initials';
import './UserMenu.css';

/** Menú de usuario: Mis eventos, notificaciones, idioma (elección con ✓) y Cerrar sesión. */
const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, locale, setLocale } = useT();
  const navigate = useNavigate();

  if (!user) return null;
  const label = t('nav.userMenu', { name: user.name });

  return (
    <Menu
      label={label}
      trigger={
        <Button variant="onBand" size="sm" aria-label={label} className="ly-user-menu__trigger">
          <span className="ly-user-menu__avatar" aria-hidden="true">
            {initials(user.name)}
          </span>
          <span className="ly-user-menu__name">{user.name}</span>
        </Button>
      }
      items={[
        { id: 'my-events', label: t('nav.myEvents'), onSelect: () => navigate('/my-events') },
        { id: 'notifications', label: t('nav.notifications'), onSelect: () => navigate('/notifications') },
        { id: 'lang-es', label: t('language.es'), selected: locale === 'es', onSelect: () => setLocale('es') },
        { id: 'lang-en', label: t('language.en'), selected: locale === 'en', onSelect: () => setLocale('en') },
        { id: 'logout', label: t('nav.logout'), onSelect: () => logout() },
      ]}
    />
  );
};

export default UserMenu;
