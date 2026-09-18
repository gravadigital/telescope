import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './CreateEventPage.css';

interface CreateEventFormData {
  name: string;
  description: string;
  organizer: string;
  maxParticipants: number;
}

const CreateEventPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [formData, setFormData] = useState<CreateEventFormData>({
    name: '',
    description: '',
    organizer: '',
    maxParticipants: 20,
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!isAuthenticated) navigate('/events');
  }, [isAuthenticated, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 1 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    // Generate tomorrow as the event date — backend requires a future date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const autoDate = tomorrow.toISOString().split('T')[0];

    try {
      const newEvent = await EventService.createEvent({ ...formData, date: autoDate });
      navigate(`/events/${newEvent.id}`);
    } catch (err) {
      let msg = 'Error creating event. Please try again.';
      if (err instanceof Error) {
        if (err.message.includes('DUPLICATE_EVENT_NAME'))
          msg = 'An event with this name already exists. Please choose a different name.';
        else if (err.message.includes('INVALID_PAYLOAD'))
          msg = 'Invalid form data. Please check all required fields.';
        else if (err.message)
          msg = err.message;
      }
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  const nameValid = formData.name.trim().length >= 3 && formData.name.length <= 200;
  const descValid = formData.description.trim().length >= 10 && formData.description.length <= 2000;
  const isFormValid = nameValid && descValid;

  if (!isAuthenticated) return null;

  return (
    <div className="create-event-page">
      <div className="create-event-container">

        <div className="create-event-header">
          <button onClick={() => navigate('/events')} className="btn btn-secondary btn-sm back-button">
            ← Back to Events
          </button>
          <h1>Create Event</h1>
          <p className="subtitle">Fill in the details to set up a new event</p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ margin: '20px 40px 0' }}>
            <p>{error}</p>
          </div>
        )}

        <div className="create-event-form-container">
          <form onSubmit={handleSubmit} className="create-event-form">

            {/* ── Identification ───────────────────────────────────────── */}
            <div className="form-section">
              <h3>Identification</h3>

              <div className="form-group">
                <label className="form-label" htmlFor="name">
                  Event name <span className="required">*</span>
                </label>
                <input
                  id="name"
                  className="form-input"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Spring Photo Contest 2026"
                  maxLength={200}
                />
                <small className="form-help">
                  A short, descriptive title that participants will see in the events list.
                  Between 3 and 200 characters.
                </small>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="description">
                  Description <span className="required">*</span>
                </label>
                <textarea
                  id="description"
                  className="form-textarea"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  placeholder="Explain what the event is about, what participants are expected to submit, and how the judging works."
                  rows={6}
                  maxLength={2000}
                />
                <small className="form-help">
                  Describe the event purpose, submission guidelines, and evaluation criteria.
                  {' '}{formData.description.length}/2000 characters (minimum 10).
                </small>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="organizer">
                  Organizer name
                </label>
                <input
                  id="organizer"
                  className="form-input"
                  type="text"
                  name="organizer"
                  value={formData.organizer}
                  onChange={handleChange}
                  placeholder="e.g. Photography Club, Science Dept."
                />
                <small className="form-help">
                  The person, team, or institution responsible for this event. Shown publicly on the event page. Optional.
                </small>
              </div>
            </div>

            {/* ── Configuration ────────────────────────────────────────── */}
            <div className="form-section">
              <h3>Configuration</h3>

              <div className="form-group">
                <label className="form-label" htmlFor="maxParticipants">
                  Maximum participants
                </label>
                <input
                  id="maxParticipants"
                  className="form-input"
                  type="number"
                  name="maxParticipants"
                  value={formData.maxParticipants}
                  onChange={handleChange}
                  min={1}
                  max={100}
                />
                <small className="form-help">
                  How many people can register. Once this limit is reached, new registrations are blocked.
                  Between 1 and 100. Default: 20.
                </small>
              </div>

              <div className="form-hint-box">
                <span className="form-hint-icon">ℹ️</span>
                <p>
                  Deadline dates for each stage (Participation, Voting) are set when you advance
                  the event to that stage from the management panel.
                </p>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate('/events')}
                className="btn btn-secondary btn-lg"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !isFormValid}
                className="btn btn-primary btn-lg"
              >
                {creating ? (
                  <><span className="loading-spinner-small"></span>Creating…</>
                ) : (
                  'Create Event'
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateEventPage;
