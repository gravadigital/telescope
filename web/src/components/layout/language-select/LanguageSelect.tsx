import React from 'react';
import { useT, LOCALES } from '../../../i18n';
import type { Locale } from '../../../i18n';
import { GlobeIcon } from '../../ui/icons/Icons';
import './LanguageSelect.css';

export interface LanguageSelectProps {
  /** `onLight` invierte los colores para fondos claros (AuthLayout). */
  tone?: 'onBand' | 'onLight';
  /** Reemplaza las banderas por un ícono de idioma. */
  compact?: boolean;
}

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
const LanguageSelect: React.FC<LanguageSelectProps> = ({ tone = 'onBand', compact = false }) => {
  const { t, locale, setLocale } = useT();

  return (
    <span
      className={[
        'ly-language-select',
        tone === 'onLight' ? 'ly-language-select--on-light' : '',
        compact ? 'ly-language-select--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="group"
      aria-label={t('nav.languageMenu', { code: locale.toUpperCase() })}
    >
      {compact && <GlobeIcon className="ly-language-select__globe" width={16} height={16} />}
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          className={`ly-language-select__option${l === locale ? ' ly-language-select__option--active' : ''}`}
          aria-pressed={l === locale}
          onClick={() => setLocale(l)}
        >
          {compact ? null : FLAGS[l]}
          {l.toUpperCase()}
        </button>
      ))}
    </span>
  );
};

export default LanguageSelect;
