import React, { useState, useMemo } from 'react';
import './StageAdvanceModal.css';

type EventStage = 'creation' | 'participation' | 'voting' | 'results';

interface StageAdvanceModalProps {
  currentStage: EventStage;
  nextStage: EventStage;
  onConfirm: (estimatedEndDate?: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const STAGE_NAMES: Record<EventStage, string> = {
  creation: 'Creation',
  participation: 'Participation',
  voting: 'Voting',
  results: 'Results'
};

const StageAdvanceModal: React.FC<StageAdvanceModalProps> = ({
  currentStage,
  nextStage,
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  // Calcular fecha por defecto según la etapa
  const defaultDate = useMemo(() => {
    const today = new Date();
    const daysToAdd = nextStage === 'participation' ? 7 : 3;
    today.setDate(today.getDate() + daysToAdd);
    return today.toISOString().split('T')[0];
  }, [nextStage]);

  const [estimatedDate, setEstimatedDate] = useState<string>(defaultDate);
  const [error, setError] = useState<string>('');

  // Determinar si esta etapa requiere fecha
  const requiresDate = nextStage === 'participation' || nextStage === 'voting';

  // Fecha mínima (hoy)
  const minDate = new Date().toISOString().split('T')[0];

  const handleConfirm = async () => {
    setError('');

    // Validar fecha si es requerida
    if (requiresDate) {
      if (!estimatedDate) {
        setError('Please select an estimated end date');
        return;
      }

      if (estimatedDate < minDate) {
        setError('Date cannot be in the past');
        return;
      }
    }

    try {
      await onConfirm(requiresDate ? estimatedDate : undefined);
    } catch (err: any) {
      setError(err.message || 'Failed to advance stage');
    }
  };

  const getStageDescription = (): string => {
    switch (nextStage) {
      case 'participation':
        return 'Participants will be able to register and upload their files.';
      case 'voting':
        return 'Participants will be able to vote on submitted entries.';
      case 'results':
        return 'Voting will close and results will be visible.';
      default:
        return '';
    }
  };

  return (
    <div className="stage-modal-overlay" onClick={onCancel}>
      <div className="stage-modal" onClick={e => e.stopPropagation()}>
        <div className="stage-modal-header">
          <h2>Advance to {STAGE_NAMES[nextStage]}?</h2>
          <button className="stage-modal-close" onClick={onCancel}>×</button>
        </div>

        <div className="stage-modal-body">
          <p className="stage-modal-description">
            {getStageDescription()}
          </p>

          <div className="stage-transition-info">
            <span className="stage-badge current">{STAGE_NAMES[currentStage]}</span>
            <span className="stage-arrow">→</span>
            <span className="stage-badge next">{STAGE_NAMES[nextStage]}</span>
          </div>

          {requiresDate && (
            <div className="stage-modal-date-field">
              <label htmlFor="estimated-end-date">
                📅 Estimated End Date for {STAGE_NAMES[nextStage]}
                <span className="required">*</span>
              </label>
              <p className="field-hint">
                This date will be shown to participants so they know when this stage is expected to close.
              </p>
              <input
                type="date"
                id="estimated-end-date"
                value={estimatedDate}
                onChange={(e) => setEstimatedDate(e.target.value)}
                min={minDate}
                disabled={isLoading}
              />
            </div>
          )}

          {error && (
            <div className="stage-modal-error">
              ⚠️ {error}
            </div>
          )}
        </div>

        <div className="stage-modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={isLoading || (requiresDate && !estimatedDate)}
          >
            {isLoading ? 'Updating...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StageAdvanceModal;

