import React, { useState, useEffect, useRef } from 'react';
import { DistributedVotingService, AttachmentService, VoteDraftService, DraftRanking } from '../../services/api';
import { Assignment, Attachment } from '../../types';
import './RankingVotePanel.css';

interface RankingVotePanelProps {
  eventId: string;
  participantId: string;
  onVotesSubmitted: () => void;
}

interface AttachmentWithRank extends Attachment {
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
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [attachments, setAttachments] = useState<AttachmentWithRank[]>([]);

  type DraftStatus = 'idle' | 'saving' | 'saved' | 'error';
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle');
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadAssignment();
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
      setAssignment(assignmentData);

      // Cargar detalles de los attachments asignados
      const allAttachments = await AttachmentService.getEventAttachments(eventId);
      const assignedAttachments = allAttachments.filter(att =>
        assignmentData.attachment_ids.includes(att.id)
      );
      setAttachments(assignedAttachments);

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
    } catch (err: any) {
      console.error('❌ Failed to load assignment:', err);
      
      // Check if the error is because voting hasn't been configured yet
      const errorMessage = err?.message || err?.toString() || '';
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        setError('Voting has not been configured yet. Please wait for the organizer to set up the voting system.');
      } else {
        setError('Failed to load your assignment. Please try again later.');
      }
    } finally {
      setLoading(false);
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
          {assignment.quality_score !== null && assignment.quality_score !== undefined && (
            <p className="quality-score">
              Your quality score: <strong>{(assignment.quality_score * 100).toFixed(1)}%</strong>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ranking-vote-panel">
      <h3>🎯 Rank your assigned submissions</h3>
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
        {attachments.map((att) => (
          <div key={att.id} className="attachment-item">
            <div className="attachment-info">
              <strong>{att.original_name}</strong>
              <small>
                Uploaded: {new Date(att.uploaded_at).toLocaleDateString()} |
                Size: {(att.file_size / 1024 / 1024).toFixed(2)} MB
              </small>
              {att.url && (
                <a 
                  href={`http://localhost:8080${att.url}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="download-link"
                >
                  📥 Download / View File
                </a>
              )}
            </div>
            <div className="rank-selector">
              <label>Rank:</label>
              <select
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
