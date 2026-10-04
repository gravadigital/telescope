import React, { useState, useEffect, useRef } from 'react';
import {
  DistributedVotingService,
  AttachmentService,
  VoteDraftService,
  DraftRanking,
  extensionForMime
} from '../../services/api';
import { AnonymousAssignment, AssignedAttachment, VotingStatistics } from '../../types';
import './RankingVotePanel.css';

interface RankingVotePanelProps {
  eventId: string;
  participantId: string;
  onVotesSubmitted: () => void;
}

interface RankedAttachment extends AssignedAttachment {
  rank?: number;
}

const RankingVotePanel: React.FC<RankingVotePanelProps> = ({
  eventId,
  participantId,
  onVotesSubmitted
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [assignment, setAssignment] = useState<AnonymousAssignment | null>(null);
  const [noAssignment, setNoAssignment] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string>('');
  const [attachments, setAttachments] = useState<RankedAttachment[]>([]);
  const [stats, setStats] = useState<VotingStatistics | null>(null);

  type DraftStatus = 'idle' | 'saving' | 'saved' | 'error';
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle');
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadAssignment();
    loadStats();
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      if (draftResetRef.current) clearTimeout(draftResetRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, participantId]);

  const loadAssignment = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      console.log('🔍 Loading assignment for participant:', participantId, 'in event:', eventId);
      
      const assignmentData = await DistributedVotingService.getParticipantAssignment(
        eventId,
        participantId
      );
      
      console.log('✅ Assignment loaded successfully:', assignmentData);

      if (assignmentData === null) {
        setNoAssignment(true);
        setAssignment(null);
        setAttachments([]);
        return;
      }

      setNoAssignment(false);
      setAssignment(assignmentData);
      setAttachments(assignmentData.attachments.map(att => ({ ...att })));

      // Restore draft if the assignment is not yet completed
      if (!assignmentData.is_completed) {
        try {
          const draft = await VoteDraftService.getDraft(eventId, participantId);
          if (draft && draft.rankings.length > 0) {
            setAttachments(prev =>
              prev.map(att => {
                const saved = draft.rankings.find(r => r.attachment_id === att.id);
                return saved ? { ...att, rank: saved.rank } : att;
              })
            );
            console.log('📋 Draft restored:', draft.rankings.length, 'rankings');
          }
        } catch {
          // Silent: if draft restoration fails, start with empty selections
        }
      }
    } catch (err) {
      console.error('❌ Failed to load assignment:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load your assignment: ${errorMessage}.`);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (): Promise<void> => {
    try {
      const statistics = await DistributedVotingService.getVotingStatistics(eventId);
      setStats(statistics);
    } catch {
      // Silent: the progress counter is supplementary data
    }
  };

  const renderProgress = (): React.ReactNode => {
    if (!stats || stats.total_assignments <= 0) return null;
    const percent = Math.round(stats.completion_rate * 100);
    return (
      <div className="rvp-progress">
        <div className="rvp-progress-label">
          <span>🗳️</span>
          <span>
            <strong>{stats.completed_assignments} of {stats.total_assignments}</strong> participants have voted
          </span>
          <span className="rvp-progress-percent">{percent}%</span>
        </div>
        <div className="rvp-progress-bar">
          <div
            className={`rvp-progress-fill${stats.completion_rate >= 1 ? ' rvp-progress-fill--done' : ''}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  };

  const handleDownload = async (att: RankedAttachment, position: number): Promise<void> => {
    setDownloadError('');
    try {
      await AttachmentService.downloadAssignedAttachment(att.id, position, att.mime_type);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setDownloadError(`Could not download "${att.label}": ${errorMessage}.`);
    }
  };

  const handleRankChange = (attachmentId: string, rank: number): void => {
    const updatedAttachments = attachments.map(att =>
      att.id === attachmentId ? { ...att, rank } : att
    );
    setAttachments(updatedAttachments);

    // Debounced auto-save: cancel any pending save and schedule a new one
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    if (draftResetRef.current) clearTimeout(draftResetRef.current);
    setDraftStatus('saving');

    draftTimerRef.current = setTimeout(async () => {
      try {
        const rankings: DraftRanking[] = updatedAttachments
          .filter(att => att.rank !== undefined)
          .map(att => ({ attachment_id: att.id, rank: att.rank! }));

        await VoteDraftService.saveDraft(eventId, participantId, rankings);
        setDraftStatus('saved');

        // Auto-hide the indicator after 3 seconds
        draftResetRef.current = setTimeout(() => setDraftStatus('idle'), 3000);
      } catch {
        setDraftStatus('error');
      }
    }, 500);
  };

  const handleSubmit = async (): Promise<void> => {
    // Validar que todos tengan ranking
    const unranked = attachments.filter(att => !att.rank);
    if (unranked.length > 0) {
      setError('Please rank all assigned attachments before submitting');
      return;
    }

    // Validar que no haya rankings duplicados
    const ranks = attachments.map(att => att.rank).filter(r => r);
    const uniqueRanks = new Set(ranks);
    if (ranks.length !== uniqueRanks.size) {
      setError('Each attachment must have a unique rank. No duplicates allowed.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const rankings = attachments.map(att => ({
        attachment_id: att.id,
        rank: att.rank!
      }));

      console.log('📤 Submitting votes:', rankings);

      await DistributedVotingService.submitRankingVotes(
        eventId,
        participantId,
        assignment!.id,
        rankings
      );

      console.log('✅ Votes submitted successfully, reloading assignment...');
      setSuccess('Your rankings have been submitted successfully!');
      
      // Reload the assignment to get the updated is_completed status
      await loadAssignment();
      loadStats();

      onVotesSubmitted();
    } catch (err: any) {
      console.error('❌ Submit error:', err);
      const errorMsg = err?.response?.data?.error || err?.message || 'Failed to submit rankings. Please try again.';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="ranking-vote-panel">
        <div className="loading">Loading your assignment...</div>
      </div>
    );
  }

  if (noAssignment) {
    return (
      <div className="ranking-vote-panel">
        <div className="message" role="status">
          <strong>You are not taking part in this vote.</strong>
          <p>Only participants who submitted a proposal evaluate the others.</p>
        </div>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="ranking-vote-panel">
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="ranking-vote-panel">
        <div className="error">No assignment found for this event</div>
      </div>
    );
  }

  if (assignment.is_completed) {
    return (
      <div className="ranking-vote-panel">
        <div className="completed-assignment">
          <h3>✅ Assignment Completed</h3>
          <p>You have already submitted your rankings for this event.</p>
          {renderProgress()}
        </div>
      </div>
    );
  }

  return (
    <div className="ranking-vote-panel">
      <h3>🎯 Rank your assigned submissions</h3>
      {renderProgress()}
      <p className="instructions">
        You have been assigned {attachments.length} submission{attachments.length !== 1 ? 's' : ''} to review.
        Rank them from best (1) to worst ({attachments.length}) — each must have a unique position.
      </p>

      <div className="rvp-quality-note">
        <span className="rvp-quality-icon">⚖️</span>
        <p>
          <strong>Your vote carries weight based on quality.</strong> The system compares your
          rankings with those of other reviewers. The more consistent your rankings are with the
          group, the more influence your vote has on the final result. Rank carefully and honestly —
          your assessment matters.
        </p>
      </div>

      <div className="attachments-list">
        {attachments.map((att, index) => (
          <div key={att.id} className="attachment-item">
            <div className="attachment-info">
              <strong>{att.label}</strong>
              <small>
                {extensionForMime(att.mime_type).toUpperCase()} · {(att.file_size / 1024 / 1024).toFixed(2)} MB
              </small>
              {att.description && <p className="attachment-description">{att.description}</p>}
              <button
                type="button"
                className="download-link"
                onClick={() => handleDownload(att, index + 1)}
              >
                <span aria-hidden="true">📥</span> Download / View File
              </button>
            </div>
            <div className="rank-selector">
              <label htmlFor={`rank-${att.id}`}>Rank:</label>
              <select
                id={`rank-${att.id}`}
                aria-label={`Rank for ${att.label}`}
                value={att.rank || ''}
                onChange={(e) => handleRankChange(att.id, parseInt(e.target.value))}
              >
                <option value="">Select...</option>
                {Array.from({ length: attachments.length }, (_, i) => i + 1).map(rank => (
                  <option key={rank} value={rank}>
                    {rank} {rank === 1 ? '(Best)' : rank === attachments.length ? '(Worst)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      {downloadError && <div className="message error-message" role="alert">{downloadError}</div>}
      {error && <div className="message error-message">{error}</div>}
      {success && <div className="message success-message">{success}</div>}

      {draftStatus !== 'idle' && (
        <div className={`draft-status draft-status--${draftStatus}`}>
          {draftStatus === 'saving' && '⏳ Saving draft...'}
          {draftStatus === 'saved'  && '✓ Draft saved'}
          {draftStatus === 'error'  && '⚠ Draft not saved — check your connection'}
        </div>
      )}

      <button
        className="primary-btn"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? 'Submitting...' : 'Submit Rankings'}
      </button>
    </div>
  );
};

export default RankingVotePanel;
