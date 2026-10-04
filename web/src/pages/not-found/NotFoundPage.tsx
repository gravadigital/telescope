import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EmptyState from '../../components/ui/empty-state/EmptyState';
import { SearchIcon } from '../../components/ui/icons/Icons';
import { useT } from '../../i18n';
import './NotFoundPage.css';

/** Ruta `*`: lo que se buscaba no existe (o no está disponible); siempre ofrece una salida. */
const NotFoundPage: React.FC = () => {
  const { t } = useT();
  const navigate = useNavigate();
  const columnRef = React.useRef<HTMLDivElement>(null);
  const documentTitle = t('notFound.documentTitle');

  React.useEffect(() => {
    const previous = document.title;
    document.title = documentTitle;
    return () => {
      document.title = previous;
    };
  }, [documentTitle]);

  React.useEffect(() => {
    const heading = columnRef.current?.querySelector('h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus();
    }
  }, []);

  return (
    <div className="nf-page">
      <div className="nf-page__column" ref={columnRef}>
        <EmptyState
          variant="page"
          icon={<SearchIcon />}
          title={t('notFound.title')}
          description={t('notFound.description')}
          action={{ label: t('notFound.goToEvents'), onClick: () => navigate('/events') }}
        />
        <Link to="/" className="nf-page__link">
          {t('notFound.backHome')}
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
