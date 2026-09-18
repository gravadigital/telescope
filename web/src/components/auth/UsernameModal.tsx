import React, { useState } from 'react';
import Modal from '../modal/Modal';
import { useAuth } from '../../context/AuthContext';
import { GoogleAuthService } from '../../services/api';

interface UsernameModalProps {
  googleToken: string;
  suggestedName: string;
  onSuccess: () => void;
  onClose: () => void;
}

const UsernameModal: React.FC<UsernameModalProps> = ({
  googleToken,
  suggestedName,
  onSuccess,
  onClose,
}) => {
  const [username, setUsername] = useState(suggestedName);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const isValid = /^[a-zA-Z0-9_ -]{3,}$/.test(username.trim());

  const handleConfirm = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    setError('');
    try {
      const { user, token } = await GoogleAuthService.register(googleToken, username);
      login(user, token);
      onSuccess();
    } catch (err: any) {
      if (
        err?.message?.includes('409') ||
        err?.message?.includes('USERNAME_ALREADY_EXISTS')
      ) {
        setError('This username is already taken');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="auth-header">
        <h2>Choose a username</h2>
      </div>
      <p className="username-modal-description">
        To complete your Google sign-up, choose a username.
      </p>
      <div className="form-group">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setError('');
          }}
          placeholder="Minimum 3 characters"
        />
      </div>
      {error && <div className="error-message">{error}</div>}
      <button
        className="auth-submit-btn"
        onClick={handleConfirm}
        disabled={!isValid || loading}
      >
        {loading ? 'Creating account...' : 'Confirm'}
      </button>
      <button className="username-modal-cancel-btn" onClick={onClose}>
        Cancel
      </button>
    </Modal>
  );
};

export default UsernameModal;
