import React from 'react';
import './Countdown.css';

export interface CountdownUnits {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

export interface CountdownProps {
  title: string;
  expiredText: string;
  units: CountdownUnits;
  /** Cierre: fin del día de la fecha límite (hora local). */
  target: Date;
  footer?: string;
  /** Solo tests: "ahora" en ms. */
  now?: number;
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

/** Resta hasta el cierre en días/horas/min/segundos (pura, testeable). */
export const getCountdownParts = (targetMs: number, nowMs: number): CountdownParts => {
  const diff = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: targetMs <= nowMs,
  };
};

const pad = (n: number): string => String(n).padStart(2, '0');

/** Cuenta regresiva al cierre (inscripción, votación, ranking): mismo diseño, distinto plazo. */
const Countdown: React.FC<CountdownProps> = ({ title, expiredText, units, target, footer, now }) => {
  const targetMs = target.getTime();
  const [ticking, setTicking] = React.useState<number>(() => now ?? Date.now());
  const expired = ticking >= targetMs;

  React.useEffect(() => {
    if (now !== undefined || expired) return;
    const id = window.setInterval(() => setTicking(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [now, expired, targetMs]);

  const parts = getCountdownParts(targetMs, ticking);
  const heading = expired ? expiredText : title;

  const boxes: Array<{ value: number; unit: string }> = [
    { value: parts.days, unit: units.days },
    { value: parts.hours, unit: units.hours },
    { value: parts.minutes, unit: units.minutes },
    { value: parts.seconds, unit: units.seconds },
  ];

  return (
    <div className="ev-countdown">
      <p className="ev-countdown__title">{heading}</p>
      <div
        className="ev-countdown__boxes"
        role="timer"
        aria-label={`${heading}: ${parts.days} ${units.days}, ${parts.hours} ${units.hours}, ${parts.minutes} ${units.minutes}, ${parts.seconds} ${units.seconds}`}
      >
        {boxes.map((box) => (
          <div key={box.unit} className="ev-countdown__box">
            <span className="ev-countdown__value">{pad(box.value)}</span>
            <span className="ev-countdown__unit">{box.unit}</span>
          </div>
        ))}
      </div>
      {footer && <p className="ev-countdown__footer">{footer}</p>}
    </div>
  );
};

export default Countdown;
