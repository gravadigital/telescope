import React from 'react';
import './Card.css';

export type CardVariant = 'default' | 'subtle' | 'raised' | 'feature' | 'interactive';
export type CardPadding = 'compact' | 'default' | 'spacious';
export type CardElement = 'section' | 'article' | 'a' | 'button';

export interface CardProps {
  variant?: CardVariant;
  padding?: CardPadding;
  as?: CardElement;
  eyebrow?: string;
  title?: string;
  headingLevel?: 2 | 3 | 4;
  /** Solo con `as="a"`. */
  href?: string;
  /** Solo con `as="a"` o `as="button"`. */
  onClick?: React.MouseEventHandler<HTMLElement>;
  className?: string;
  children?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'default',
  as = 'section',
  eyebrow,
  title,
  headingLevel = 2,
  href,
  onClick,
  className,
  children,
}) => {
  const titleId = React.useId();
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const classes = ['ui-card', `ui-card--${variant}`, `ui-card--pad-${padding}`, className ?? '']
    .filter(Boolean)
    .join(' ');

  const props: Record<string, unknown> = { className: classes };
  if (title && (as === 'section' || as === 'article')) props['aria-labelledby'] = titleId;
  if (as === 'a') props.href = href;
  if (as === 'button') props.type = 'button';
  if (as === 'a' || as === 'button') props.onClick = onClick;

  return React.createElement(
    as,
    props,
    eyebrow && <p className="ui-card__eyebrow">{eyebrow}</p>,
    title && (
      <Heading id={titleId} className="ui-card__title">
        {title}
      </Heading>
    ),
    children
  );
};

export default Card;
