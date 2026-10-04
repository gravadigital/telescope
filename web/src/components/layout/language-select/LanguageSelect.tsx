import React from 'react';
import Button from '../../ui/button/Button';
import Menu from '../../ui/menu/Menu';
import { ChevronDownIcon } from '../../ui/icons/Icons';
import { useT, LOCALES } from '../../../i18n';
import './LanguageSelect.css';

/** Selector de idioma de la barra para visitantes (ES / EN). */
const LanguageSelect: React.FC = () => {
  const { t, locale, setLocale } = useT();
  const code = locale.toUpperCase();

  return (
    <span className="ly-language-select">
      <Menu
        variant="select"
        label={t('nav.languageMenu', { code })}
        trigger={
          <Button
            variant="onBand"
            size="sm"
            aria-label={t('nav.languageMenu', { code })}
            iconEnd={<ChevronDownIcon />}
          >
            {code}
          </Button>
        }
        items={LOCALES.map((l) => ({
          id: l,
          label: t(`language.${l}`),
          selected: l === locale,
          onSelect: () => setLocale(l),
        }))}
      />
    </span>
  );
};

export default LanguageSelect;
