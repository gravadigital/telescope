import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AuthLayout from '../../components/layout/auth-layout/AuthLayout';
import { Button, Callout, TextField } from '../../components/ui';
import { isValidEmail } from '../../domain';
import { scopedMessageKeyForError, useT } from '../../i18n';
import type { TranslationKey } from '../../i18n';
import { UserService } from '../../services/api';

type InputRef = HTMLInputElement | HTMLTextAreaElement;

const readEmail = (state: unknown): string => {
  if (state && typeof state === 'object' && 'email' in state) {
    const { email } = state as { email?: unknown };
    if (typeof email === 'string') return email;
  }
  return '';
};

const ForgotPasswordPage: React.FC = () => {
  const { t } = useT();
  const location = useLocation();
  const [email, setEmail] = useState(() => readEmail(location.state));
  const [emailError, setEmailError] = useState<TranslationKey | undefined>();
  const [formError, setFormError] = useState<TranslationKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const emailRef = useRef<InputRef>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    if (sentTo !== null) statusRef.current?.focus();
  }, [sentTo]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setFormError(null);
    if (!isValidEmail(email)) {
      setEmailError('auth.validation.emailInvalid');
      emailRef.current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const trimmed = email.trim();
      await UserService.forgotPassword(trimmed);
      setSentTo(trimmed);
    } catch (err) {
      setFormError(scopedMessageKeyForError(err, ['INVALID_PAYLOAD'], 'auth.forgot.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      brandTitle={t('auth.forgot.brandTitle')}
      backLink={{ to: '/login', label: t('auth.forgot.backToLogin') }}
      title={t('auth.forgot.title')}
    >
      {sentTo !== null ? (
        <div role="status" tabIndex={-1} ref={statusRef}>
          <Callout tone="success" title={t('auth.forgot.sentTitle')}>
            {t('auth.forgot.sentBody', { email: sentTo })}
          </Callout>
        </div>
      ) : (
        <>
          <p className="ly-auth__text">{t('auth.forgot.explanation')}</p>
          <form className="ly-auth__form" onSubmit={handleSubmit} noValidate>
            <TextField
              ref={emailRef}
              type="email"
              name="email"
              size="lg"
              label={t('auth.fields.email')}
              placeholder={t('auth.fields.emailPlaceholder')}
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(undefined);
              }}
              error={emailError && t(emailError)}
            />
            {formError && <Callout tone="error">{t(formError)}</Callout>}
            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={submitting}
              loadingLabel={t('auth.forgot.submitting')}
            >
              {t('auth.forgot.submit')}
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
