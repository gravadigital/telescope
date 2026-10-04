import React from 'react';
import { Link } from 'react-router-dom';
import { CheckIcon } from '../../ui/icons/Icons';
import { useT } from '../../../i18n';
import './AuthLayout.css';

export interface AuthLayoutProps {
  /** Mensaje de marca (h2) del panel oscuro. */
  brandTitle: string;
  /** Beneficios del panel de marca; se ocultan en mobile. */
  benefits?: string[];
  backLink?: { to: string; label: string; state?: unknown };
  /** Título de la página (h1). */
  title: string;
  headingRef?: React.Ref<HTMLHeadingElement>;
  children: React.ReactNode;
}

/**
 * Layout dividido de las páginas de autenticación (1b): marca a la izquierda (5/12) y formulario
 * a la derecha (7/12) en desktop; en mobile, franja de marca compacta sobre el formulario.
 * No incluye barra global ni pie.
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({
  brandTitle,
  benefits,
  backLink,
  title,
  headingRef,
  children,
}) => {
  const { t } = useT();
  return (
    <main id="main" className="ly-auth">
      <aside className="ly-auth__brand">
        <p className="ly-auth__logo">{t('common.appName')}</p>
        <h2 className="ly-auth__brand-title">{brandTitle}</h2>
        {benefits && benefits.length > 0 && (
          <ul className="ly-auth__benefits">
            {benefits.map((benefit) => (
              <li key={benefit} className="ly-auth__benefit">
                <CheckIcon aria-hidden="true" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <section className="ly-auth__panel">
        <div className="ly-auth__content">
          {backLink && (
            <Link className="ly-auth__back" to={backLink.to} state={backLink.state}>
              {backLink.label}
            </Link>
          )}
          <h1 className="ly-auth__title" ref={headingRef} tabIndex={-1}>
            {title}
          </h1>
          {children}
        </div>
      </section>
    </main>
  );
};

export default AuthLayout;
