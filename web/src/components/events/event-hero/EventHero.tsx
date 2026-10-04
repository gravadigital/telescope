import React from 'react';
import { Link } from 'react-router-dom';
import './EventHero.css';

export interface EventHeroProps {
  back?: { label: string; to: string };
  /** Típicamente `StatusPill tone="onBand"`. */
  pills?: React.ReactNode;
  title: string;
  meta?: React.ReactNode;
  /** Típicamente `Button variant="onBand"`. */
  actions?: React.ReactNode;
}

const EventHero: React.FC<EventHeroProps> = ({ back, pills, title, meta, actions }) => (
  <header className="ev-hero">
    <div className="ev-hero__inner">
      {back && (
        <Link to={back.to} className="ev-hero__back">
          {back.label}
        </Link>
      )}
      <div className="ev-hero__row">
        <div className="ev-hero__main">
          {pills && <div className="ev-hero__pills">{pills}</div>}
          <h1 className="ev-hero__title">{title}</h1>
          {meta && <p className="ev-hero__meta">{meta}</p>}
        </div>
        {actions && <div className="ev-hero__actions">{actions}</div>}
      </div>
    </div>
  </header>
);

export default EventHero;
