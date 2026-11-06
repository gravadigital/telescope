import React from 'react';
import { Link } from 'react-router-dom';
import { coverColorVar } from '../../../domain/coverColors';
import type { CoverColorId } from '../../../domain/coverColors';
import './EventHero.css';

export interface EventHeroProps {
  back?: { label: string; to: string };
  /** Color de portada del evento (REQ-004). Sin color, el CSS usa el default. */
  coverColor?: CoverColorId;
  /** Típicamente `StatusPill` con su tono por defecto: el hero ya no es una banda oscura. */
  pills?: React.ReactNode;
  title: string;
  meta?: React.ReactNode;
  /** Típicamente `Button variant="secondary"`. */
  actions?: React.ReactNode;
}

const EventHero: React.FC<EventHeroProps> = ({ back, coverColor, pills, title, meta, actions }) => (
  <header
    className="ev-hero"
    style={coverColor ? ({ '--ev-hero-bg': coverColorVar(coverColor) } as React.CSSProperties) : undefined}
  >
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
