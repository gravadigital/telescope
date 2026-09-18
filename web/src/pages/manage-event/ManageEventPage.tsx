import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EventService, AttachmentService, DistributedVotingService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Event, User } from '../../types';
import VotingResultsPanel from '../../components/voting-results-panel/VotingResultsPanel';
import VotingConfigurationPanel from '../../components/voting-configuration-panel/VotingConfigurationPanel';
import StageAdvanceModal from '../../components/stage-advance-modal/StageAdvanceModal';
import EventTimeline from '../../components/event-timeline/EventTimeline';
import '../../components/stage-advance-modal/StageAdvanceModal.css';
import './ManageEventPage.css';

const ManageEventPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [votingStatus, setVotingStatus] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [updatingStage, setUpdatingStage] = useState<boolean>(false);
  const [votingConfigured, setVotingConfigured] = useState<boolean>(false);
  
  // Estados para modales de fecha estimativa (S-003)
  const [showStageModal, setShowStageModal] = useState<boolean>(false);
  const [showEditDateModal, setShowEditDateModal] = useState<boolean>(false);
  const [editingStage, setEditingStage] = useState<'participation' | 'voting' | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/events');
      return;
    }

    if (eventId) {
      loadEventData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, isAuthenticated, navigate]);

  const loadEventData = async (): Promise<void> => {
    if (!eventId) return;

    setLoading(true);
    setError('');

    try {
      // Load event details
      const eventData = await EventService.getEventById(eventId);

      // Check if event exists
      if (!eventData) {
        setError('Event not found.');
        setLoading(false);
        return;
      }

      // Check if user is the creator
      if (eventData.creator_id !== user?.id) {
        setError('You do not have permission to manage this event.');
        setLoading(false);
        return;
      }

      setEvent(eventData);

      // Load participants
      try {
        const participantsData = await EventService.getEventParticipants(eventId);
        setParticipants(participantsData);
      } catch (err) {
        console.warn('Could not load participants:', err);
        setParticipants([]);
      }
      
      // Load attachments
      try {
        console.log('🔄 Loading attachments for event:', eventId);
        const attachmentsData = await AttachmentService.getEventAttachments(eventId);
        console.log('📎 Raw attachments data:', attachmentsData);
        console.log('📊 Attachment count:', attachmentsData.length);
        console.log('📋 Attachment details:', attachmentsData.map(a => ({
          id: a.id,
          participant_id: a.participant_id,
          author_id: a.author_id,
          filename: a.filename
        })));
        setAttachments(attachmentsData);
      } catch (err: any) {
        console.error('❌ Failed to load attachments:', err);
        console.error('Error details:', err.message);
        setAttachments([]);
      }

      // Load voting statistics if in voting or results stage
      if (eventData.stage === 'voting' || eventData.stage === 'results') {
        try {
          const statsData = await DistributedVotingService.getVotingStatistics(eventId);
          console.log('📊 Voting statistics:', statsData);

          if (statsData && statsData.participant_voting_status) {
            setVotingStatus(statsData.participant_voting_status);

            // Check if there are actual assignments (voting is configured)
            // If participant_voting_status is not empty, voting is configured
            const hasAssignments = Object.keys(statsData.participant_voting_status).length > 0;
            setVotingConfigured(hasAssignments);

            console.log('✅ Voting configured status:', hasAssignments);
          } else {
            setVotingConfigured(false);
          }
        } catch (err) {
          console.warn('Could not load voting statistics:', err);
          // If we can't load stats, voting might not be configured yet
          setVotingConfigured(false);
        }
      } else {
        // Not in voting/results stage, reset voting status
        setVotingConfigured(false);
      }
    } catch (err) {
      console.error('Error loading event:', err);
      setError('Error loading event data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal para avanzar etapa (S-003)
  const handleAdvanceStageClick = (): void => {
    const next = getNextStage(event!.stage);
    if (next) {
      setShowStageModal(true);
    }
  };

  // Confirmar avance de etapa con fecha estimativa (S-003)
  const handleStageConfirm = async (estimatedEndDate?: string): Promise<void> => {
    if (!eventId || !event) return;

    const nextStage = getNextStage(event.stage);
    if (!nextStage) return;

    // Validations before advancing
    const validationError = validateStageAdvance(event.stage, nextStage);
    if (validationError) {
      throw new Error(validationError);
    }

    setUpdatingStage(true);
    setError('');

    try {
      await EventService.updateEventStage(eventId, nextStage, estimatedEndDate);
      setShowStageModal(false);

      // Reload event data
      await loadEventData();

      console.log(`Event stage updated to: ${nextStage}`);
    } catch (err: any) {
      console.error('Error updating stage:', err);
      throw new Error(err.message || 'Error updating event stage');
    } finally {
      setUpdatingStage(false);
    }
  };

  // Abrir modal para editar fecha (S-003)
  const handleEditDeadlineClick = (stage: 'participation' | 'voting'): void => {
    setEditingStage(stage);
    setShowEditDateModal(true);
  };

  // Confirmar edición de fecha (S-003)
  const handleEditDeadlineConfirm = async (newDate: string): Promise<void> => {
    if (!eventId || !editingStage) return;

    setUpdatingStage(true);

    try {
      await EventService.updateEstimatedEndDate(eventId, editingStage, newDate);
      setShowEditDateModal(false);
      setEditingStage(null);

      // Reload event data
      await loadEventData();
    } catch (err: any) {
      console.error('Error updating deadline:', err);
      throw new Error(err.message || 'Error updating deadline');
    } finally {
      setUpdatingStage(false);
    }
  };

  // Formatear fecha con tiempo relativo (S-003)
  const formatEstimatedDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let relative = '';
    if (diffDays === 0) {
      relative = '(today)';
    } else if (diffDays === 1) {
      relative = '(tomorrow)';
    } else if (diffDays > 1) {
      relative = `(in ${diffDays} days)`;
    } else if (diffDays === -1) {
      relative = '(yesterday)';
    } else {
      relative = `(${Math.abs(diffDays)} days ago)`;
    }

    return `${formattedDate} ${relative}`;
  };

  const validateStageAdvance = (currentStage: Event['stage'], targetStage: Event['stage']): string | null => {
    // Can't advance from participation if no participants
    if (currentStage === 'participation' && participants.length === 0) {
      return 'Cannot advance: No participants registered yet.';
    }

    // Note: We no longer require all participants to submit files before advancing to voting
    // This allows flexibility in the participation stage

    // Can't advance to results from voting without voting configuration
    if (currentStage === 'voting' && targetStage === 'results') {
      // Check if all participants have voted
      const totalParticipants = participants.length;
      const votedCount = Object.values(votingStatus).filter(voted => voted).length;
      if (votedCount < totalParticipants) {
        return `Cannot advance: Only ${votedCount} of ${totalParticipants} participants have voted.`;
      }
    }

    return null;
  };

  const handlePauseToggle = async (): Promise<void> => {
    if (!eventId || !event) return;

    const action = event.is_paused ? 'resume' : 'pause';
    if (!window.confirm(`${action === 'pause' ? '⏸️ Pause' : '▶️ Resume'} this event? ${action === 'pause' ? 'Participants will not be able to register or upload files while the event is paused.' : ''}`)) {
      return;
    }

    setUpdatingStage(true);
    setError('');

    try {
      await EventService.pauseEvent(eventId);
      await loadEventData();
    } catch (err) {
      console.error('Error toggling event pause:', err);
      setError('Error updating event. Please try again.');
    } finally {
      setUpdatingStage(false);
    }
  };

const getNextStage = (currentStage: Event['stage']): Event['stage'] | null => {
  const stageOrder: Event['stage'][] = ['creation', 'participation', 'voting', 'results'];
  const currentIndex = stageOrder.indexOf(currentStage);

  if (currentIndex >= 0 && currentIndex < stageOrder.length - 1) {
    return stageOrder[currentIndex + 1];
  }

  return null;
};


const getStageName = (stage: Event['stage']): string => {
  const stageNames: Record<Event['stage'], string> = {
    'creation': 'Creation',
    'participation': 'Participation',
    'voting': 'Voting',
    'results': 'Results'
  };
  return stageNames[stage] || stage;
};

  const handleBack = (): void => {
    navigate(`/events/${eventId}`);
  };

  if (loading) {
    return (
      <div className="manage-event-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <h2>Loading event...</h2>
        </div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="manage-event-page">
        <div className="error-state">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/events')} className="btn btn-primary">
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="manage-event-page">
        <div className="error-state">
          <h2>Event not found</h2>
          <button onClick={() => navigate('/events')} className="btn btn-primary">
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const nextStage = getNextStage(event.stage);

  return (
    <div className="manage-event-page">
      <div className="manage-event-container">
        {/* Header */}
        <div className="manage-header">
          <button onClick={handleBack} className="btn btn-secondary btn-sm back-button">
            ← Back to Event Details
          </button>
          <h1>Manage Event</h1>
          <p className="subtitle">Control event stages and view participants</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-danger">
            <p>{error}</p>
          </div>
        )}

        {/* Event Info Card */}
        <div className="event-info-card">
          <h2>{event.title}</h2>
          <p className="event-description">{event.description}</p>

          <div className="event-meta">
            <div className="meta-item">
              <span className="meta-label">Created:</span>
              <span className="meta-value">
                {new Date(event.created_at || event.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>

            <div className="meta-item">
              <span className="meta-label">Current Stage:</span>
              <span className={`badge badge-${
                event.stage === 'participation' ? 'success' :
                event.stage === 'voting' ? 'warning' : 'primary'
              }`}>
                {getStageName(event.stage)}
              </span>
              {event.is_paused && (
                <span className="badge badge-paused" style={{ marginLeft: '8px' }}>
                  ⏸ PAUSED
                </span>
              )}
            </div>

            <div className="meta-item">
              <span className="meta-label">Participants:</span>
              <span className="meta-value">{participants.length} / {event.max_participants || 20}</span>
            </div>
            
            <div className="meta-item">
              <span className="meta-label">Files Submitted:</span>
              <span className="meta-value">
                {new Set(attachments.map(a => a.participant_id)).size} / {participants.length}
              </span>
            </div>

            {/* Deadline de la etapa actual */}
            {event.stage === 'participation' && (
              <div className="meta-item deadline-meta">
                <span className="meta-label">Participation Deadline:</span>
                <span className="meta-value">
                  {event.participation_estimated_end_date
                    ? <>
                        {formatEstimatedDate(event.participation_estimated_end_date)}
                        <button
                          className="btn-edit-deadline"
                          onClick={() => handleEditDeadlineClick('participation')}
                          title="Edit deadline"
                        >✏️</button>
                      </>
                    : <button
                        className="btn-set-deadline"
                        onClick={() => handleEditDeadlineClick('participation')}
                      >
                        + Set deadline
                      </button>
                  }
                </span>
              </div>
            )}

            {event.stage === 'voting' && (
              <div className="meta-item deadline-meta">
                <span className="meta-label">Voting Deadline:</span>
                <span className="meta-value">
                  {event.voting_estimated_end_date
                    ? <>
                        {formatEstimatedDate(event.voting_estimated_end_date)}
                        <button
                          className="btn-edit-deadline"
                          onClick={() => handleEditDeadlineClick('voting')}
                          title="Edit deadline"
                        >✏️</button>
                      </>
                    : <button
                        className="btn-set-deadline"
                        onClick={() => handleEditDeadlineClick('voting')}
                      >
                        + Set deadline
                      </button>
                  }
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stage Control Section */}
        <div className="stage-control-section">
          <h3>Event Stage Control</h3>

          <EventTimeline
            currentStage={event.stage}
            deadlines={{
              participation: event.participation_estimated_end_date,
              voting: event.voting_estimated_end_date,
            }}
          />

          <div className="stage-actions">
            {nextStage && (
              <button
                onClick={handleAdvanceStageClick}
                disabled={updatingStage}
                className="btn btn-primary btn-lg"
              >
                {updatingStage ? (
                  <>
                    <span className="loading-spinner-small"></span>
                    Updating...
                  </>
                ) : (
                  `Advance to ${getStageName(nextStage)}`
                )}
              </button>
            )}

            {!event.is_cancelled && event.stage !== 'results' && (
              <button
                onClick={handlePauseToggle}
                disabled={updatingStage}
                className={`btn btn-lg ${event.is_paused ? 'btn-primary' : 'btn-secondary'}`}
                style={{ marginLeft: '10px' }}
              >
                {updatingStage ? 'Updating...' : event.is_paused ? '▶ Resume Event' : '⏸ Pause Event'}
              </button>
            )}

            {event.stage === 'results' && (
              <div className="completed-message">
                <span className="completed-icon">✓</span>
                Event has reached final results
              </div>
            )}
          </div>
        </div>

        {/* Voting Configuration Section (only show in voting stage if not configured) */}
        {event.stage === 'voting' && !votingConfigured && (
          <div className="voting-configuration-section">
            <VotingConfigurationPanel
              eventId={event.id}
              totalAttachments={attachments.length}
              totalParticipants={participants.length}
              onConfigured={() => {
                setVotingConfigured(true);
                loadEventData();
              }}
            />
          </div>
        )}

        {/* Voting Configured Message */}
        {event.stage === 'voting' && votingConfigured && (
          <div className="voting-configured-section">
            <div className="alert alert-success">
              <h3>✅ Voting is underway</h3>
              <p>Reviewers have been assigned their submissions and can now submit their rankings.</p>
              <p>Once everyone has voted, advance to "Results" to publish the final ranking.</p>
            </div>
          </div>
        )}

        {/* Participants Section (only show if not in results stage) */}
        {event.stage !== 'results' && (
          <div className="participants-section">
            <h3>Registered Participants ({participants.filter(p => p.id !== event.creator_id).length})</h3>

            {participants.filter(p => p.id !== event.creator_id).length === 0 ? (
              <div className="empty-state">
                <p>No participants have registered yet.</p>
                <p>Share the event link to invite participants!</p>
              </div>
            ) : (
              <div className="participants-table">
                <div className="table-header">
                  <div className="header-cell">Name</div>
                  <div className="header-cell">Email</div>
                  <div className="header-cell">File Status</div>
                  <div className="header-cell">Voting Status</div>
                </div>

                <div className="table-body">
                  {participants
                    .filter(p => p.id !== event.creator_id)
                    .map((participant) => {
                    const hasSubmittedFile = attachments.some(
                      att => att.participant_id === participant.id || att.author_id === participant.id
                    );
                    const hasVoted = votingStatus[participant.id] === true;

                    return (
                      <div key={participant.id} className="table-row">
                        <div className="table-cell">{participant.name}</div>
                        <div className="table-cell">{participant.email}</div>
                        <div className="table-cell">
                          {hasSubmittedFile
                            ? <span className="badge badge-success">✓ Submitted</span>
                            : <span className="badge badge-warning">⏳ Pending</span>
                          }
                        </div>
                        <div className="table-cell">
                          {event.stage === 'voting' || event.stage === 'results' ? (
                            hasVoted
                              ? <span className="badge badge-success">✓ Voted</span>
                              : <span className="badge badge-warning">⏳ Not Voted</span>
                          ) : (
                            <span className="badge badge-secondary">N/A</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results Section (only show when in results stage) */}
        {event.stage === 'results' && (
          <div className="results-section">
            <VotingResultsPanel eventId={event.id} />
          </div>
        )}

        {/* Stage Advance Modal - S-003 */}
        {showStageModal && nextStage && (
          <StageAdvanceModal
            currentStage={event.stage}
            nextStage={nextStage}
            onConfirm={handleStageConfirm}
            onCancel={() => setShowStageModal(false)}
            isLoading={updatingStage}
          />
        )}

        {/* Edit Deadline Modal - S-003 */}
        {showEditDateModal && editingStage && (
          <EditDeadlineModal
            stage={editingStage}
            currentDate={
              editingStage === 'participation'
                ? event.participation_estimated_end_date
                : event.voting_estimated_end_date
            }
            onConfirm={handleEditDeadlineConfirm}
            onCancel={() => {
              setShowEditDateModal(false);
              setEditingStage(null);
            }}
            isLoading={updatingStage}
            formatEstimatedDate={formatEstimatedDate}
          />
        )}
      </div>
    </div>
  );
};

// Componente inline para editar fecha - S-003
const EditDeadlineModal: React.FC<{
  stage: 'participation' | 'voting';
  currentDate?: string | null;
  onConfirm: (newDate: string) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  formatEstimatedDate: (date: string) => string;
}> = ({ stage, currentDate, onConfirm, onCancel, isLoading, formatEstimatedDate }) => {
  const [newDate, setNewDate] = useState(currentDate || '');
  const [error, setError] = useState('');

  const minDate = new Date().toISOString().split('T')[0];

  const handleConfirm = async () => {
    setError('');
    try {
      await onConfirm(newDate);
    } catch (err: any) {
      setError(err.message || 'Failed to update deadline');
    }
  };

  return (
    <div className="stage-modal-overlay" onClick={onCancel}>
      <div className="stage-modal" onClick={e => e.stopPropagation()}>
        <div className="stage-modal-header">
          <h2>Edit {stage === 'participation' ? 'Participation' : 'Voting'} Deadline</h2>
          <button className="stage-modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="stage-modal-body">
          {currentDate && (
            <p className="current-date-info">
              Current deadline: <strong>{formatEstimatedDate(currentDate)}</strong>
            </p>
          )}
          <div className="stage-modal-date-field">
            <label>New Deadline<span className="required">*</span></label>
            <p className="field-hint">
              Note: You can only postpone the deadline, not bring it forward.
            </p>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={minDate}
              disabled={isLoading}
            />
          </div>
          {error && <div className="stage-modal-error">⚠️ {error}</div>}
        </div>
        <div className="stage-modal-footer">
          <button className="btn btn-secondary" onClick={onCancel} disabled={isLoading}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleConfirm} 
            disabled={isLoading || !newDate}
          >
            {isLoading ? 'Updating...' : 'Update Deadline'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageEventPage;
