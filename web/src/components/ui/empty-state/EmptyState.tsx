import React from 'react';
import Button from '../button/Button';
import './EmptyState.css';

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

export interface EmptyStateProps {
  variant?: 'inline' | 'page';
  icon?: React.ReactNode;
  title: string;
  /** Nivel del título; `page` usa 1 por defecto. */
  headingLevel?: 1 | 2 | 3 | 4;
  description?: string;
  action?: EmptyStateAction;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'inline',
  icon,
  title,
  headingLevel,
  description,
  action,
}) => {
  const level = headingLevel ?? (variant === 'page' ? 1 : 2);
  const Heading = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4';
  const buttonVariant = variant === 'page' ? 'primary' : 'secondary';

  return (
    <div className={`ui-empty-state ui-empty-state--${variant}`}>
      {icon && (
        <div className="ui-empty-state__icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <Heading className="ui-empty-state__title">{title}</Heading>
      {description && <p className="ui-empty-state__text">{description}</p>}
      {action && action.href ? (
        <a className={`ui-empty-state__link ui-button ui-button--md ui-button--${buttonVariant}`} href={action.href}>
          {action.label}
        </a>
      ) : (
        action && (
          <Button variant={buttonVariant} onClick={action.onClick}>
            {action.label}
          </Button>
        )
      )}
    </div>
  );
};

export default EmptyState;
