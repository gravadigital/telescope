import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../components/layout/auth-layout/AuthLayout';
import { Button, Callout, TextField } from '../../components/ui';
import { validateNewPassword } from '../../domain';
import type { FieldErrors } from '../../domain';
import { ApiError } from '../../config/api';
import { useT } from '../../i18n';
import type { TranslationKey } from '../../i18n';
import { UserService } from '../../services/api';

type View = 'form' | 'success' | 'invalid';
type ResetField = 'password' | 'confirm';
type InputRef = HTMLInputElement | HTMLTextAreaElement;

const TOKEN_ERRORS = ['INVALID_RESET_TOKEN', 'EXPIRED_RESET_TOKEN'];

const ResetPasswordPage: React.FC = () => {
  const { t } = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [view, setView] = useState<View>(token ? 'form' : 'invalid');
  const [formData, setFormData] = useState({ password: '', confirm: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<ResetField>>({});
  const [formError, setFormError] = useState<TranslationKey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const passwordRef = useRef<InputRef>(null);
  const confirmRef = useRef<InputRef>(null);

  useEffect(() => {
    if (view === 'form') passwordRef.current?.focus();
    else headingRef.current?.focus();
  }, [view]);

  const handleChange = (e: React.ChangeEvent<InputRef>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setFormError(null);
    const errors = validateNewPassword(formData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      (errors.password ? passwordRef : confirmRef).current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await UserService.resetPassword(token, formData.password);
      setView('success');
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      if (code && TOKEN_ERRORS.includes(code)) {
        setView('invalid');
      } else if (code === 'INVALID_PASSWORD') {
        setFieldErrors({ password: 'errors.INVALID_PASSWORD' });
        passwordRef.current?.focus();
      } else {
        setFormError('auth.reset.error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const titles: Record<View, TranslationKey> = {
    form: 'auth.reset.title',
    success: 'auth.reset.successTitle',
    invalid: 'auth.reset.invalidTitle',
  };

  return (
    <AuthLayout
      brandTitle={t('auth.reset.brandTitle')}
      title={t(titles[view])}
      headingRef={headingRef}
    >
      <div className="ly-auth__form" aria-live="polite">
        {view === 'form' && (
          <form className="ly-auth__form" onSubmit={handleSubmit} noValidate>
            <TextField
              ref={passwordRef}
              type="password"
              name="password"
              size="lg"
              label={t('auth.reset.newPassword')}
              placeholder={t('auth.fields.newPasswordPlaceholder')}
              showPasswordLabel={t('auth.fields.showPassword')}
              hidePasswordLabel={t('auth.fields.hidePassword')}
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={handleChange}
              error={fieldErrors.password && t(fieldErrors.password)}
            />
            <TextField
              ref={confirmRef}
              type="password"
              name="confirm"
              size="lg"
              label={t('auth.reset.repeatPassword')}
              autoComplete="new-password"
              required
              value={formData.confirm}
              onChange={handleChange}
              error={fieldErrors.confirm && t(fieldErrors.confirm)}
            />
            {formError && <Callout tone="error">{t(formError)}</Callout>}
            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={submitting}
              loadingLabel={t('auth.reset.submitting')}
            >
              {t('auth.reset.submit')}
            </Button>
          </form>
        )}
        {view === 'success' && (
          <>
            <p className="ly-auth__text">{t('auth.reset.successBody')}</p>
            <Button size="lg" fullWidth onClick={() => navigate('/login')}>
              {t('auth.reset.goToLogin')}
            </Button>
          </>
        )}
        {view === 'invalid' && (
          <>
            <p className="ly-auth__text">{t('auth.reset.invalidBody')}</p>
            <Button size="lg" fullWidth onClick={() => navigate('/forgot-password')}>
              {t('auth.reset.requestNew')}
            </Button>
          </>
        )}
      </div>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
