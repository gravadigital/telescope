import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';  
import './Events.css';
import { Event, EventsProps } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ApiHealthService, EventService } from '../../services/api';


interface EventsComponentProps extends EventsProps {
  onViewEventDetail?: (eventId: string) => void;
}

const Events: React.FC<EventsComponentProps> = ({ onViewEventDetail }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'subscriptions'>('all');

  const { isAuthenticated, user, openAuthModal } = useAuth();

  // Reload events when returning to /events page
  useEffect(() => {
    if (location.pathname === '/events') {
      checkApiAndFetchEvents();
    }
  }, [location.pathname]);

  useEffect(() => {
    checkApiAndFetchEvents();
  }, []);

  const checkApiAndFetchEvents = async (): Promise<void> => {
    setLoading(true);
    setError('');
    
    try {
      const isHealthy = await ApiHealthService.checkHealth();
      
      if (isHealthy) {
        console.log('API is available, loading events from server...');
      } else {
        console.log('API not available, using demo data...');
      }
      
      const eventsData = await EventService.getAllEvents();
      setEvents(eventsData);
      
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Error loading events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = (): void => {
    checkApiAndFetchEvents();
  };

  const handleCreateEvent = (): void => {
    navigate('/events/create');
  };

  const getStageDisplayName = (stage: Event['stage']): string => {
    const stages: Record<Event['stage'], string> = {
      'creation': 'Creation',
      'participation': 'Participation',
      'voting': 'Voting',
      'results': 'Completed'
    };
    return stages[stage] || stage;
  };

  // Separate events into three categories
  const myEvents = user ? events.filter(event => event.creator_id === user.id) : [];
  
  // Subscriptions: events where user is participant but NOT creator
  const subscribedEvents = user 
    ? events.filter(event => {
        const isParticipant = event.participant_ids?.includes(user.id) || 
                            user.joinedEventIDs?.includes(event.id);
        const isCreator = event.creator_id === user.id;
        return isParticipant && !isCreator;
      })
    : [];
  
  // All events: exclude both own events and subscribed events
  const allEvents = user 
    ? events.filter(event => {
        const isCreator = event.creator_id === user.id;
        const isParticipant = event.participant_ids?.includes(user.id) || 
                            user.joinedEventIDs?.includes(event.id);
        return !isCreator && !isParticipant;
      })
    : events;

  const displayEvents = activeTab === 'my' 
    ? myEvents 
    : activeTab === 'subscriptions' 
      ? subscribedEvents 
      : allEvents;

  if (loading) {
    return (
      <div className="events-container">
        <div className="events-content">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h2>Loading events...</h2>
            <p>Connecting to server...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="events-container">
        <div className="events-content">
          <div className="events-header">
            <h1>Browse Events</h1>

            <div className="events-controls">
              <button
                className="btn btn-warning btn-md"
                onClick={() => {
                  if (isAuthenticated) {
                    handleCreateEvent();
                  } else {
                    openAuthModal('login');
                  }
                }}
                title={!isAuthenticated ? "Log in to create events" : ""}
              >
                Create Event
              </button>

              <button
                className="btn btn-secondary btn-md"
                onClick={handleRefresh}
                disabled={loading}
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Tabs for My Events / All Events / Subscriptions */}
          {isAuthenticated && (myEvents.length > 0 || subscribedEvents.length > 0) && (
            <div className="events-tabs">
              <button
                className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All Events ({allEvents.length})
              </button>
              <button
                className={`tab-button ${activeTab === 'my' ? 'active' : ''}`}
                onClick={() => setActiveTab('my')}
              >
                My Events ({myEvents.length})
              </button>
              <button
                className={`tab-button ${activeTab === 'subscriptions' ? 'active' : ''}`}
                onClick={() => setActiveTab('subscriptions')}
              >
                My Subscriptions ({subscribedEvents.length})
              </button>
            </div>
          )}

          {error && (
            <div className="alert alert-danger">
              <p>{error}</p>
              <button onClick={handleRefresh} className="btn btn-danger btn-sm">
                Retry
              </button>
            </div>
          )}
          
          {displayEvents.length === 0 && !loading && !error ? (
            <div className="empty-state">
              <p>
                {activeTab === 'my' 
                  ? 'You have not created any events yet.' 
                  : activeTab === 'subscriptions'
                    ? 'You have not subscribed to any events yet.'
                    : 'No events available at this time.'}
              </p>
              <p>
                {activeTab === 'my' 
                  ? 'Click "Create Event" to get started!' 
                  : activeTab === 'subscriptions'
                    ? 'Browse events and register to participate!'
                    : 'Come back soon for new observation opportunities!'}
              </p>
            </div>
          ) : (
            <div className="events-table-container">
              <div className="events-table">
                <div className="table-header">
                  <div className="header-cell header-title">Event</div>
                  <div className="header-cell header-date">Created</div>
                  <div className="header-cell header-stage">Stage</div>
                  <div className="header-cell header-participants">Participants</div>
                  <div className="header-cell header-actions">Actions</div>
                </div>

                <div className="table-body">
                  {displayEvents.map((event) => (
                    <div key={event.id} className="table-row">
                      <div className="table-cell cell-title">
                        <div className="event-title-section">
                          <h3>{event.title}</h3>
                          <p className="event-description-preview">{event.description}</p>
                        </div>
                      </div>
                      
                      <div className="table-cell cell-date">
                        <span className="cell-label">Created:</span>
                        {(() => {
                          try {
                            const date = new Date(event.created_at || event.date);
                            return isNaN(date.getTime())
                              ? '—'
                              : date.toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                });
                          } catch {
                            return 'TBD';
                          }
                        })()}
                      </div>

                      <div className="table-cell cell-stage">
                        <span className="cell-label">Stage:</span>
                        <span className={`badge badge-${
                          event.stage === 'participation' ? 'success' :
                          event.stage === 'voting' ? 'warning' : 'primary'
                        }`}>
                          {getStageDisplayName(event.stage)}
                        </span>
                        {event.is_paused && (
                          <span className="badge badge-paused" style={{ marginLeft: '6px' }}>
                            ⏸ PAUSED
                          </span>
                        )}
                        {event.is_cancelled && (
                          <span className="badge badge-cancelled" style={{ marginLeft: '6px' }}>
                            CANCELLED
                          </span>
                        )}
                      </div>
                      
                      <div className="table-cell cell-participants">
                        <span className="cell-label">Participants:</span>
                        <span className="participants-count">
                          {event.participant_ids?.length || 0} / {event.max_participants || 20}
                        </span>
                      </div>
                      
                      <div className="table-cell cell-actions">
                        <div className="action-buttons">
                          {(() => {
                            const isEventCreator = user && event.creator_id === user.id;
                            const isInUserJoinedEvents = user?.joinedEventIDs?.includes(event.id);
                            const isInEventParticipants = event.participant_ids?.includes(user?.id || '');
                            const isUserRegistered = isInUserJoinedEvents || isInEventParticipants;

                            // Creator: only show Manage button
                            if (isEventCreator) {
                              return (
                                <button
                                  className="btn btn-warning btn-sm"
                                  onClick={() => navigate(`/events/${event.id}/manage`)}
                                  title="Manage event stages and settings"
                                >
                                  Manage
                                </button>
                              );
                            }

                            // Non-creator: single contextual button
                            const goToEvent = () => {
                              if (onViewEventDetail) {
                                onViewEventDetail(event.id);
                              } else {
                                navigate(`/events/${event.id}`);
                              }
                            };

                            if (event.stage === 'participation' && isUserRegistered) {
                              return (
                                <button className="btn btn-primary btn-sm" onClick={goToEvent} title="Upload your file">
                                  Upload File
                                </button>
                              );
                            }

                            if (event.stage === 'participation' && !isUserRegistered) {
                              return (
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => isAuthenticated ? goToEvent() : openAuthModal('login')}
                                  title="Participate in this event"
                                >
                                  Participate
                                </button>
                              );
                            }

                            if (event.stage === 'voting' && isUserRegistered) {
                              return (
                                <button className="btn btn-success btn-sm" onClick={goToEvent} title="Submit your votes">
                                  Vote
                                </button>
                              );
                            }

                            if (event.stage === 'results' && isUserRegistered) {
                              return (
                                <button className="btn btn-primary btn-sm" onClick={goToEvent} title="See final rankings">
                                  See Results
                                </button>
                              );
                            }

                            return (
                              <button className="btn btn-secondary btn-sm" onClick={goToEvent} title="View event details">
                                View Event
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Events;
