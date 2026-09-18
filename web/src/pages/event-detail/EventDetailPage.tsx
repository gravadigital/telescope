import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Event } from '../../types';
import { EventService, ApiHealthService, AttachmentService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Participants from '../../components/participants/Participants';
import VotingConfigurationPanel from '../../components/voting-configuration-panel/VotingConfigurationPanel';
import RankingVotePanel from '../../components/ranking-vote-panel/RankingVotePanel';
import VotingResultsPanel from '../../components/voting-results-panel/VotingResultsPanel';
import './EventDetailPage.css';
import ShareButton from '../../components/ShareButton';
import Modal from '../../components/modal/Modal';
import EventTimeline from '../../components/event-timeline/EventTimeline';
import StageAdvanceModal from '../../components/stage-advance-modal/StageAdvanceModal';
import '../../components/stage-advance-modal/StageAdvanceModal.css';

interface EventDetailPageProps {
  eventId: string;
  onBack: () => void;
}

const EventDetailPage: React.FC<EventDetailPageProps> = ({ eventId, onBack }) => {
  const { user, isAuthenticated, joinEvent, openAuthModal } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [showUploadConfirm, setShowUploadConfirm] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUserRegistered, setIsUserRegistered] = useState<boolean>(false);
  const [showParticipants, setShowParticipants] = useState<boolean>(false);
  const [currentStage, setCurrentStage] = useState<Event['stage'] | null>(null);
  const [stageLoading, setStageLoading] = useState<boolean>(false);
  const [votingConfigured, setVotingConfigured] = useState<boolean>(false);
  const [userHasSubmittedFile, setUserHasSubmittedFile] = useState<boolean>(false);
  const [showStageModal, setShowStageModal] = useState<boolean>(false);

  useEffect(() => {
    fetchEventDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    if (user && event) {
      const inJoinedEvents = user.joinedEventIDs.includes(event.id);
      const inParticipantList = event.participant_ids?.includes(user.id) || false;
      setIsUserRegistered(inJoinedEvents || inParticipantList);
    }
  }, [user, event, joinEvent]);

  const fetchEventDetails = async (): Promise<void> => {
    setLoading(true);
    setError('');

    try {
      const isHealthy = await ApiHealthService.checkHealth();
      if (!isHealthy) {
        setError('Unable to connect to the server. Using cached data if available.');
      }

      const eventData = await EventService.getEventById(eventId);

      if (eventData) {
        setEvent(eventData);
        setCurrentStage(eventData.stage);
        setError('');

        if (user && eventData.stage === 'participation') {
          try {
            const attachments = await AttachmentService.getEventAttachments(eventId);
            const userAttachment = attachments.find((att: any) =>
              att.participant_id === user.id || att.author_id === user.id
            );
            setUserHasSubmittedFile(!!userAttachment);
          } catch {
            setUserHasSubmittedFile(false);
          }
        }
      } else {
        setError(`Event with ID "${eventId}" was not found.`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load event details: ${errorMessage}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleStageConfirm = async (targetStage: Event['stage'], estimatedEndDate?: string): Promise<void> => {
    if (!event) return;
    setStageLoading(true);
    setError('');
    try {
      await EventService.updateEventStage(event.id, targetStage, estimatedEndDate);
      setCurrentStage(targetStage);
      setSuccess(`Stage updated to: ${getStageDisplayName(targetStage)}`);
      setShowStageModal(false);
      await fetchEventDetails();
    } catch {
      setError('Error updating event stage');
    } finally {
      setStageLoading(false);
    }
  };

  const getNextStage = (stage: Event['stage']): Event['stage'] | null => {
    const order: Event['stage'][] = ['creation', 'participation', 'voting', 'results'];
    const idx = order.indexOf(stage);
    return idx < order.length - 1 ? order[idx + 1] : null;
  };

  const handleRegister = async (): Promise<void> => {
    if (!isAuthenticated || !user || !event) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await EventService.registerForEvent(event.id, user.name, user.email);
      setSuccess('Successfully registered! You can now upload your file.');
      setIsUserRegistered(true);
      if (joinEvent) joinEvent(event.id);
      await fetchEventDetails();
    } catch {
      setError('Failed to register for the event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('File cannot exceed 10MB'); return; }
    const allowed = ['image/jpeg','image/png','image/gif','image/webp','application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) { setError('File type not allowed. Use: JPEG, PNG, GIF, WebP, PDF, TXT, DOC, DOCX'); return; }
    setSelectedFile(file);
    setError('');
  };

  const handleClearFile = (): void => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadAttachment = async (): Promise<void> => {
    setShowUploadConfirm(false);
    if (!selectedFile || !event || !user) return;
    setUploadLoading(true);
    setError('');
    setSuccess('');
    try {
      await AttachmentService.uploadAttachment(event.id, user.id, selectedFile);
      setSuccess('File uploaded successfully!');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchEventDetails();
    } catch (err: any) {
      setError(`Upload failed: ${err?.message || 'Please try again.'}`);
    } finally {
      setUploadLoading(false);
    }
  };

  const getStageDisplayName = (stage: Event['stage']): string => ({
    creation: 'Creation',
    participation: 'Participation',
    voting: 'Voting',
    results: 'Results',
  }[stage] ?? stage);



  // ── Loading / error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="event-detail-page">
        <div className="event-detail-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h2>Loading event details...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="event-detail-page">
        <div className="event-detail-container">
          <button onClick={onBack} className="btn btn-secondary btn-sm" style={{ marginBottom: '20px' }}>← Back to Events</button>
          <div className="alert alert-danger">
            <h3 style={{ marginTop: 0 }}>⚠️ Unable to Load Event</h3>
            <p style={{ marginBottom: '20px' }}>{error || 'Event not found'}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={onBack} className="btn btn-secondary">← Back to Events List</button>
              <button onClick={fetchEventDetails} className="btn btn-primary">🔄 Try Again</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentStage) return null;

  // ── Derived permissions ───────────────────────────────────────────────────

  const isEventCreator = user?.id === event.creator_id;
  const isEventPaused  = event.is_paused === true;
  const isOrganizer    = isEventCreator || user?.role === 'admin';
  const nextStage      = getNextStage(currentStage);
  const canUploadAttachment = currentStage === 'participation' && isAuthenticated && isUserRegistered && !userHasSubmittedFile && !isEventCreator && !isEventPaused;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="event-detail-page">
      <div className="event-detail-container">

        {/* ── Navegación ────────────────────────────────────────────────── */}
        <nav className="edp-nav">
          <button onClick={onBack} className="btn btn-secondary btn-sm back-button">← Back to Events</button>
        </nav>

        {/* ── Bloque 1: Presentación ─────────────────────────────────────── */}
        <section className="edp-presentation">
          <div className="edp-presentation-body">
            <div className="edp-title-row">
              <h1>{event.title}</h1>
              <ShareButton eventId={event.id} eventTitle={event.title} />
            </div>
            <p className="event-subtitle">{event.description}</p>

            <div className="edp-meta-row">
              <div className="edp-meta-item">
                <span className="edp-meta-icon">👤</span>
                <span>{event.organizer || 'Not specified'}</span>
              </div>
              <div className="edp-meta-item edp-meta-participants">
                <span className="edp-meta-icon">👥</span>
                <span>{event.participant_ids?.length || 0} / {event.max_participants || 20} participants</span>
                {(event.participant_ids?.length ?? 0) > 0 && (
                  <button className="edp-participants-toggle" onClick={() => setShowParticipants(v => !v)}>
                    {showParticipants ? 'Hide' : 'View'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {showParticipants && (
          <Participants eventId={event.id} eventTitle={event.title} onClose={() => setShowParticipants(false)} />
        )}

        {/* ── Bloque 2: Estado del evento ────────────────────────────────── */}
        <section className="edp-status">
          <EventTimeline
            currentStage={currentStage}
            deadlines={{
              participation: event.participation_estimated_end_date,
              voting: event.voting_estimated_end_date,
            }}
          />

          {isEventPaused && (
            <div className="edp-paused-notice">
              <span>⏸</span>
              <span>This event is currently paused</span>
            </div>
          )}
        </section>

        {/* ── Mensajes de feedback ────────────────────────────────────────── */}
        {success && <div className="alert alert-success"><p>{success}</p></div>}
        {error   && <div className="alert alert-danger"><p>{error}</p></div>}

        {/* ── Bloque 3: Acción de la etapa ───────────────────────────────── */}
        <section className="edp-action">

          {/* Organizer: advance stage */}
          {isOrganizer && nextStage && (
            <div className="edp-action-advance">
              <button
                className="stage-advance-btn"
                onClick={() => setShowStageModal(true)}
                disabled={stageLoading}
              >
                {stageLoading ? '⏳ Updating...' : `▶️ Advance to ${getStageDisplayName(nextStage)}`}
              </button>
            </div>
          )}

          {/* Creation stage — event not open yet */}
          {currentStage === 'creation' && !isOrganizer && (
            <div className="edp-action-empty">
              <span className="edp-action-empty-icon">🔭</span>
              <p>This event is being set up. Come back when it opens for participation.</p>
            </div>
          )}

          {/* Participation stage */}
          {currentStage === 'participation' && !isEventCreator && !isEventPaused && (
            <div className="participation-section">
              {!isUserRegistered ? (
                <div className="register-section">
                  <h3>📝 Event Participation</h3>
                  <p>Register to participate and upload your file.</p>
                  <button
                    className="primary-btn"
                    onClick={() => isAuthenticated ? handleRegister() : openAuthModal('login')}
                    disabled={loading}
                  >
                    {loading ? 'Registering...' : 'Participate'}
                  </button>
                </div>
              ) : (
                <div className="upload-section">
                  <div className="registered-info">
                    <h3>✅ You're Registered</h3>
                    <p>You can now upload your file for this event.</p>
                  </div>
                  <h3>📎 Upload File</h3>
                  {userHasSubmittedFile ? (
                    <div className="message success-message">
                      ✅ You have already submitted your file. Only one submission is allowed per participant.
                    </div>
                  ) : (
                    <>
                      <p>Upload your submission for this event.</p>
                      <div className="file-upload">
                        <input
                          ref={fileInputRef}
                          id="attachment-file"
                          type="file"
                          onChange={handleFileChange}
                          disabled={uploadLoading || !canUploadAttachment}
                          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.doc,.docx"
                        />
                        {selectedFile && (
                          <div className="file-preview">
                            <div className="file-preview-info">
                              <div className="file-preview-details">
                                <p className="file-preview-name">{selectedFile.name}</p>
                                <p className="file-preview-size">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                              </div>
                            </div>
                            <button className="file-clear-btn" onClick={handleClearFile} title="Remove selected file">×</button>
                          </div>
                        )}
                        <button
                          className="primary-btn"
                          onClick={() => setShowUploadConfirm(true)}
                          disabled={uploadLoading || !selectedFile || !canUploadAttachment}
                        >
                          {uploadLoading ? 'Uploading...' : 'Upload File'}
                        </button>
                      </div>
                      <div className="upload-info">
                        <h4>📋 Allowed file types:</h4>
                        <ul>
                          <li>Images: JPEG, PNG, GIF, WebP</li>
                          <li>Documents: PDF, TXT, DOC, DOCX</li>
                          <li>Maximum size: 10 MB</li>
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Paused notice for participants */}
          {isEventPaused && !isEventCreator && (
            <div className="alert alert-danger">
              <p>⏸ Registration and file submissions are not available while the event is paused.</p>
            </div>
          )}

          {/* Voting stage — organizer: configure */}
          {currentStage === 'voting' && isOrganizer && !votingConfigured && (
            <VotingConfigurationPanel
              eventId={event.id}
              totalAttachments={event.attachmentCount || 0}
              totalParticipants={event.participant_ids?.length || 0}
              onConfigured={() => {
                setVotingConfigured(true);
                setSuccess('✅ Voting configuration completed! Participants can now submit their rankings.');
              }}
            />
          )}
          {currentStage === 'voting' && isOrganizer && votingConfigured && (
            <div className="voting-configured-info">
              <h3>✅ Voting is underway</h3>
              <p>Reviewers have been assigned their submissions and can now submit their rankings.</p>
              <p>Once everyone has voted, advance to "Results" to publish the final ranking.</p>
            </div>
          )}

          {/* Voting stage — participant: rank */}
          {currentStage === 'voting' && isUserRegistered && !isOrganizer && (
            <RankingVotePanel
              eventId={event.id}
              participantId={user?.id || ''}
              onVotesSubmitted={() => setSuccess('✅ Your rankings have been submitted successfully!')}
            />
          )}

          {/* Results stage */}
          {currentStage === 'results' && (
            <VotingResultsPanel eventId={event.id} />
          )}

        </section>
      </div>

      {/* Stage advance modal */}
      {showStageModal && nextStage && currentStage && (
        <StageAdvanceModal
          currentStage={currentStage}
          nextStage={nextStage}
          isLoading={stageLoading}
          onCancel={() => setShowStageModal(false)}
          onConfirm={(estimatedEndDate) => handleStageConfirm(nextStage, estimatedEndDate)}
        />
      )}

      {/* Upload confirmation modal */}
      {showUploadConfirm && selectedFile && (
        <Modal onClose={() => setShowUploadConfirm(false)}>
          <div className="upload-confirm-modal">
            <h3>Confirm upload</h3>
            <p>Are you sure you want to upload this file?</p>
            <div className="upload-confirm-file">
              <span className="upload-confirm-filename">{selectedFile.name}</span>
              <span className="upload-confirm-filesize">{(selectedFile.size / 1024).toFixed(2)} KB</span>
            </div>
            <div className="upload-confirm-actions">
              <button className="secondary-btn" onClick={() => setShowUploadConfirm(false)}>Cancel</button>
              <button className="primary-btn" onClick={handleUploadAttachment}>Upload</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EventDetailPage;
