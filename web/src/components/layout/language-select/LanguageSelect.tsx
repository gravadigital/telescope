import React from 'react';
import { useT, LOCALES } from '../../../i18n';
import type { Locale } from '../../../i18n';
import './LanguageSelect.css';

const FLAGS: Record<Locale, React.ReactNode> = {
  es: (
    <svg
      width="20"
      height="14"
      viewBox="0 0 20 14"
      aria-hidden="true"
      className="ly-language-select__flag"
    >
      <rect width="20" height="14" fill="#AA151B" />
      <rect y="3.5" width="20" height="7" fill="#F1BF00" />
    </svg>
  ),
  en: (
    <svg
      width="20"
      height="14"
      viewBox="0 0 20 14"
      aria-hidden="true"
      className="ly-language-select__flag"
    >
      <rect width="20" height="14" fill="#FFFFFF" />
      <rect x="8.5" width="3" height="14" fill="#CE1124" />
      <rect y="5.5" width="20" height="3" fill="#CE1124" />
    </svg>
  ),
};

/** Selector de idioma ES / EN junto al usuario (banderas, sin menú). */
const LanguageSelect: React.FC = () => {
  const { t, locale, setLocale } = useT();

  return (
    <span
      className="ly-language-select"
      role="group"
      aria-label={t('nav.languageMenu', { code: locale.toUpperCase() })}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          className={`ly-language-select__option${l === locale ? ' ly-language-select__option--active' : ''}`}
          aria-pressed={l === locale}
          onClick={() => setLocale(l)}
        >
          {FLAGS[l]}
          {l.toUpperCase()}
        </button>
      ))}
    </span>
  );
};

export default LanguageSelect;
