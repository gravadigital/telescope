import React, { useState } from 'react';
import { DistributedVotingService } from '../../services/api';
import './VotingConfigurationPanel.css';

interface VotingConfigurationPanelProps {
  eventId: string;
  totalAttachments: number;
  totalParticipants: number;
  onConfigured: () => void;
}

const VotingConfigurationPanel: React.FC<VotingConfigurationPanelProps> = ({
  eventId,
  totalAttachments,
  totalParticipants,
  onConfigured,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const maxPossibleM = totalAttachments >= totalParticipants
    ? totalAttachments - 1
    : totalAttachments;

  const recommendedM = Math.min(
    Math.max(Math.ceil(2 * Math.log2(Math.max(totalAttachments, 2))), 1),
    maxPossibleM
  );

  const [config, setConfig] = useState({
    attachments_per_evaluator: Math.max(Math.min(recommendedM, maxPossibleM), 1),
    min_evaluations_per_file: 3,
    quality_good_threshold: 0.6,
    quality_bad_threshold: 0.3,
    adjustment_magnitude: 3,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const needed = totalAttachments * config.min_evaluations_per_file;
    const available = totalParticipants * config.attachments_per_evaluator;
    if (available < needed) {
      setError(
        `Not enough evaluations: ${totalParticipants} participants × ${config.attachments_per_evaluator} files = ${available}, ` +
        `but ${totalAttachments} files × ${config.min_evaluations_per_file} min reviews = ${needed} needed. ` +
        `Try increasing "Files per reviewer" or reducing "Min reviews per file".`
      );
      setLoading(false);
      return;
    }

    try {
      try {
        await DistributedVotingService.createVotingConfig(eventId, config);
      } catch (configErr: any) {
        if (!configErr?.message?.includes('already exists') && !configErr?.message?.includes('CONFIG_EXISTS')) {
          throw configErr;
        }
      }
      await DistributedVotingService.generateAssignments(eventId);
      onConfigured();
    } catch (err: any) {
      setError(`Failed to configure voting: ${err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const readyToStart = totalAttachments >= 2 && totalParticipants >= 2;

  return (
    <div className="vcp-panel">

      <div className="vcp-header">
        <h3>Start voting phase</h3>
        <p className="vcp-subtitle">
          Each participant will be assigned a set of submissions to review and rank.
          The system distributes the workload automatically to avoid conflicts of interest.
        </p>
      </div>

      <div className="vcp-summary">
        <div className="vcp-summary-card">
          <span className="vcp-summary-value">{totalAttachments}</span>
          <span className="vcp-summary-label">Submissions</span>
        </div>
        <div className="vcp-summary-card">
          <span className="vcp-summary-value">{totalParticipants}</span>
          <span className="vcp-summary-label">Reviewers</span>
        </div>
        <div className="vcp-summary-card">
          <span className="vcp-summary-value">{config.attachments_per_evaluator}</span>
          <span className="vcp-summary-label">Files per reviewer</span>
        </div>
      </div>

      {!readyToStart && (
        <div className="vcp-warning">
          ⚠️ You need at least 2 submissions and 2 participants to start voting.
        </div>
      )}

      <form onSubmit={handleSubmit} className="vcp-form">

        <div className="vcp-field">
          <label className="vcp-label" htmlFor="vcp-m">
            Files per reviewer
          </label>
          <input
            id="vcp-m"
            className="vcp-input"
            type="number"
            min={1}
            max={maxPossibleM}
            value={config.attachments_per_evaluator}
            onChange={e => setConfig(p => ({ ...p, attachments_per_evaluator: parseInt(e.target.value) }))}
            required
          />
          <small className="vcp-hint">
            How many submissions each participant will review.
            Recommended: <strong>{recommendedM}</strong> (max: {maxPossibleM}).
            Each participant only reviews files from others — never their own.
          </small>
        </div>

        <div className="vcp-advanced">
            <p className="vcp-advanced-note">
              These settings control how reviewer quality affects the final ranking.
              The defaults work well for most events.
            </p>

            <div className="vcp-field">
              <label className="vcp-label" htmlFor="vcp-min-evals">
                Minimum reviews per file
              </label>
              <input
                id="vcp-min-evals"
                className="vcp-input"
                type="number"
                min={1}
                value={config.min_evaluations_per_file}
                onChange={e => setConfig(p => ({ ...p, min_evaluations_per_file: parseInt(e.target.value) }))}
                required
              />
              <small className="vcp-hint">
                Each submission will be reviewed by at least this many participants. Default: 3.
              </small>
            </div>

            <div className="vcp-field-row">
              <div className="vcp-field">
                <label className="vcp-label" htmlFor="vcp-q-good">
                  Good reviewer threshold
                </label>
                <input
                  id="vcp-q-good"
                  className="vcp-input"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={config.quality_good_threshold}
                  onChange={e => setConfig(p => ({ ...p, quality_good_threshold: parseFloat(e.target.value) }))}
                  required
                />
                <small className="vcp-hint">
                  Reviewers scoring above this (0–1) get a ranking bonus. Default: 0.6.
                </small>
              </div>

              <div className="vcp-field">
                <label className="vcp-label" htmlFor="vcp-q-bad">
                  Poor reviewer threshold
                </label>
                <input
                  id="vcp-q-bad"
                  className="vcp-input"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={config.quality_bad_threshold}
                  onChange={e => setConfig(p => ({ ...p, quality_bad_threshold: parseFloat(e.target.value) }))}
                  required
                />
                <small className="vcp-hint">
                  Reviewers scoring below this (0–1) get a ranking penalty. Default: 0.3.
                </small>
              </div>
            </div>

            <div className="vcp-field">
              <label className="vcp-label" htmlFor="vcp-magnitude">
                Quality adjustment strength
              </label>
              <input
                id="vcp-magnitude"
                className="vcp-input"
                type="number"
                min="1"
                value={config.adjustment_magnitude}
                onChange={e => setConfig(p => ({ ...p, adjustment_magnitude: parseInt(e.target.value) }))}
                required
              />
              <small className="vcp-hint">
                How many ranking positions a quality bonus/penalty moves a submission. Default: 3.
              </small>
            </div>
          </div>

        {error && <div className="vcp-error">{error}</div>}

        <button
          type="submit"
          className="vcp-submit"
          disabled={loading || !readyToStart}
        >
          {loading ? 'Setting up…' : 'Start voting — assign reviewers'}
        </button>
      </form>

    </div>
  );
};

export default VotingConfigurationPanel;
