import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { safeNextPath } from '../domain/redirect';
import { scopedMessageKeyForError } from '../i18n';
import type { TranslationKey } from '../i18n';
import { GoogleAuthService } from '../services/api';
import type { User } from '../types';

const GOOGLE_ERROR_CODES = ['INVALID_GOOGLE_TOKEN', 'GOOGLE_API_ERROR'] as const;

export interface GoogleSignIn {
  busy: boolean;
  error: TranslationKey | null;
  onToken: (accessToken: string) => Promise<void>;
  onError: () => void;
}

/**
 * Flujo de dos pasos de Google compartido por login y registro: usuario existente → sesión y `next`;
 * usuario nuevo → `/complete-profile`, con la credencial solo en el estado del router (nunca en
 * almacenamiento persistente).
 */
export const useGoogleSignIn = (next: string | null): GoogleSignIn => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);

  const onToken = useCallback(
    async (accessToken: string): Promise<void> => {
      setBusy(true);
      setError(null);
      try {
        const result = await GoogleAuthService.verify(accessToken);
        if (result.status === 'existing_user' && result.token && result.user) {
          const user: User = {
            id: result.user.id,
            name: result.user.username,
            email: result.user.email,
            role: 'participant',
            joinedEventIDs: [],
            createdEventIDs: [],
          };
          login(user, result.token);
          navigate(safeNextPath(next), { replace: true });
        } else if (result.status === 'new_user') {
          navigate('/complete-profile', {
            state: {
              googleToken: accessToken,
              suggestedName: result.profile?.suggested_name ?? '',
              next,
            },
          });
        } else {
          setError('auth.google.error');
        }
      } catch (err) {
        setError(scopedMessageKeyForError(err, GOOGLE_ERROR_CODES, 'auth.google.error'));
      } finally {
        setBusy(false);
      }
    },
    [login, navigate, next]
  );

  const onError = useCallback((): void => setError('auth.google.error'), []);

  return { busy, error, onToken, onError };
};
