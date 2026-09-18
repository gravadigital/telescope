import React from 'react';
import { Event } from '../../types';
import './EventTimeline.css';

interface StageConfig {
  key: Event['stage'];
  label: string;
  icon: string;
  summary: string;         // short — shown under the step marker
  detail: string;          // longer — shown in the active-stage info card
  nextHint: string;        // what happens when this stage ends
}

const STAGES: StageConfig[] = [
  {
    key: 'creation',
    label: 'Creation',
    icon: '✦',
    summary: 'Setup & configuration',
    detail: 'The organizer is preparing the event: setting details, deadlines and rules before opening it to participants.',
    nextHint: 'Once ready, the organizer will open registration.',
  },
  {
    key: 'participation',
    label: 'Participation',
    icon: '👥',
    summary: 'Register & submit files',
    detail: 'Participants register and upload their submission (photo or document). Registration closes on the deadline set by the organizer.',
    nextHint: 'When participation closes, the organizer will start the voting phase and assign reviewers.',
  },
  {
    key: 'voting',
    label: 'Voting',
    icon: '🗳',
    summary: 'Peer review & ranking',
    detail: 'Each participant receives a selected set of submissions to review — not all of them, just a manageable group. You rank them from best to worst based on your honest assessment. The system then combines everyone\'s rankings into a final score. Reviewers who rank consistently with the rest of the group have more influence on the result. If someone ranks randomly or carelessly, their vote carries less weight automatically — so the final ranking stays fair even if not everyone takes it seriously.',
    nextHint: 'Once all reviewers have voted, the organizer will publish the final results.',
  },
  {
    key: 'results',
    label: 'Results',
    icon: '🏆',
    summary: 'Final rankings revealed',
    detail: 'Voting is closed. The final ranking has been calculated and is now visible to all participants.',
    nextHint: '',
  },
];

const STAGE_ORDER: Event['stage'][] = ['creation', 'participation', 'voting', 'results'];

function getStageStatus(
  stageKey: Event['stage'],
  currentStage: Event['stage']
): 'completed' | 'active' | 'pending' {
  const ci = STAGE_ORDER.indexOf(currentStage);
  const si = STAGE_ORDER.indexOf(stageKey);
  if (si < ci) return 'completed';
  if (si === ci) return 'active';
  return 'pending';
}

function formatDeadline(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (diff < 0) return `${formatted} (closed)`;
  if (diff === 0) return `${formatted} — closes today`;
  if (diff === 1) return `${formatted} — closes tomorrow`;
  return `${formatted} — ${diff} days left`;
}

function deadlineUrgency(dateString: string): 'urgent' | 'soon' | '' {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff <= 0) return 'urgent';
  if (diff <= 2) return 'soon';
  return '';
}

export interface EventTimelineDeadlines {
  participation?: string | null;
  voting?: string | null;
}

interface EventTimelineProps {
  currentStage: Event['stage'];
  deadlines?: EventTimelineDeadlines;
  compact?: boolean;
}

const EventTimeline: React.FC<EventTimelineProps> = ({ currentStage, deadlines, compact = false }) => {
  const activeConfig = STAGES.find(s => s.key === currentStage)!;
  const nextConfig   = STAGES[STAGE_ORDER.indexOf(currentStage) + 1] ?? null;

  const stageDeadline = (key: Event['stage']): string | null | undefined => {
    if (key === 'participation') return deadlines?.participation;
    if (key === 'voting') return deadlines?.voting;
    return null;
  };

  return (
    <div className={`event-timeline-wrapper${compact ? ' etw--compact' : ''}`}>

      {/* ── Stepper row ─────────────────────────────────────────────────── */}
      <div className="event-timeline">
        {STAGES.map((stage, index) => {
          const status = getStageStatus(stage.key, currentStage);
          const dl = stageDeadline(stage.key);
          const urgency = dl ? deadlineUrgency(dl) : '';

          return (
            <React.Fragment key={stage.key}>
              <div className={`etl-step etl-step--${status}`}>
                <div className="etl-marker" aria-label={status}>
                  {status === 'completed'
                    ? <span className="etl-check">✓</span>
                    : <span className="etl-icon">{stage.icon}</span>
                  }
                </div>
                <div className="etl-info">
                  <span className="etl-label">{stage.label}</span>
                  {!compact && <span className="etl-desc">{stage.summary}</span>}
                  {!compact && dl && (
                    <span className={`etl-deadline${urgency ? ` etl-deadline--${urgency}` : ''}`}>
                      {formatDeadline(dl)}
                    </span>
                  )}
                </div>
                {status === 'active' && <span className="etl-badge">Current</span>}
              </div>
              {index < STAGES.length - 1 && (
                <div className={`etl-connector${status === 'completed' ? ' etl-connector--done' : ''}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Active stage info card ────────────────────────────────────────── */}
      {!compact && (
        <div className="etl-stage-card">
          <div className="etl-stage-card-header">
            <span className="etl-stage-card-icon">{activeConfig.icon}</span>
            <div>
              <p className="etl-stage-card-name">{activeConfig.label} stage</p>
              <p className="etl-stage-card-detail">{activeConfig.detail}</p>
            </div>
          </div>

          {activeConfig.nextHint && nextConfig && (
            <div className="etl-stage-card-next">
              <span className="etl-stage-card-next-label">Up next</span>
              <span className="etl-stage-card-next-icon">{nextConfig.icon}</span>
              <span className="etl-stage-card-next-name">{nextConfig.label}</span>
              <span className="etl-stage-card-next-hint">— {activeConfig.nextHint}</span>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default EventTimeline;
