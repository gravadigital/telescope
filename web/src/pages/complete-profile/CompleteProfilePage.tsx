import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/auth-layout/AuthLayout';
import { Button, Callout, TextField } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { DISPLAY_NAME_MAX_LENGTH, safeNextPath, validateDisplayName } from '../../domain';
import { ApiError } from '../../config/api';
import { scopedMessageKeyForError, useT } from '../../i18n';
import type { TranslationKey } from '../../i18n';
import { GoogleAuthService } from '../../services/api';

interface PendingGoogleSignUp {
  googleToken: string;
  suggestedName: string;
  next: string | null;
}

const PAGE_ERROR_CODES = ['INVALID_GOOGLE_TOKEN', 'GOOGLE_API_ERROR', 'INVALID_PAYLOAD'];

/** Lee el estado del router; devuelve `null` si no trae una credencial de Google. */
const readPending = (state: unknown): PendingGoogleSignUp | null => {
  if (!state || typeof state !== 'object') return null;
  const { googleToken, suggestedName, next } = state as Record<string, unknown>;
  if (typeof googleToken !== 'string' || googleToken === '') return null;
  return {
    googleToken,
    suggestedName: typeof suggestedName === 'string' ? suggestedName : '',
    next: typeof next === 'string' ? next : null,
  };
};

/**
 * Último paso del primer ingreso con Google. La credencial vive solo en memoria: se copia del
 * estado del router y se borra de `history.state` al montar, así una recarga o un acceso directo
 * no la encuentran y vuelven a `/login`.
 */
const CompleteProfilePage: React.FC = () => {
  const { t } = useT();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [pending] = useState(() => readPending(location.state));
  const [name, setName] = useState(pending?.suggestedName ?? '');
  const [nameError, setNameError] = useState<TranslationKey | undefined>();
  const [formError, setFormError] = useState<TranslationKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!pending) return;
    if (location.state !== null) navigate(location.pathname, { replace: true, state: null });
    inputRef.current?.focus();
    inputRef.current?.select();
    // Solo al montar: `location.state` ya se copió a `pending`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!pending) return <Navigate to="/login" replace />;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setFormError(null);
    const invalid = validateDisplayName(name);
    if (invalid) {
      setNameError(invalid);
      inputRef.current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const { user, token } = await GoogleAuthService.register(pending.googleToken, name.trim());
      login(user, token);
      navigate(safeNextPath(pending.next), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'USERNAME_ALREADY_EXISTS') {
        setNameError('auth.completeProfile.nameTaken');
        inputRef.current?.focus();
      } else {
        setFormError(scopedMessageKeyForError(err, PAGE_ERROR_CODES, 'auth.completeProfile.error'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout brandTitle={t('auth.completeProfile.brandTitle')} title={t('auth.completeProfile.title')}>
      <p className="ly-auth__text">{t('auth.completeProfile.explanation')}</p>
      <form className="ly-auth__form" onSubmit={handleSubmit} noValidate>
        <TextField
          ref={inputRef}
          name="name"
          size="lg"
          label={t('auth.completeProfile.name')}
          placeholder={t('auth.completeProfile.namePlaceholder')}
          autoComplete="nickname"
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNameError(undefined);
          }}
          error={nameError && t(nameError)}
        />
        {formError && <Callout tone="error">{t(formError)}</Callout>}
        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={submitting}
          loadingLabel={t('auth.completeProfile.submitting')}
        >
          {t('auth.completeProfile.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default CompleteProfilePage;
