import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../components/layout/auth-layout/AuthLayout';
import GoogleButton from '../../components/auth/google-button/GoogleButton';
import { Button, Callout, TextField } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { safeNextPath, validateLogin } from '../../domain';
import type { FieldErrors } from '../../domain';
import { scopedMessageKeyForError, useT } from '../../i18n';
import type { TranslationKey } from '../../i18n';
import { RUNTIME_CONFIG } from '../../config/runtime';
import { useGoogleSignIn } from '../../hooks/useGoogleSignIn';
import { UserService } from '../../services/api';

type LoginField = 'email' | 'password';
type InputRef = HTMLInputElement | HTMLTextAreaElement;

const LOGIN_ERROR_CODES = ['INVALID_CREDENTIALS', 'OAUTH_ACCOUNT_NO_PASSWORD', 'INVALID_PAYLOAD'];

const LoginPage: React.FC = () => {
  const { t } = useT();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<LoginField>>({});
  const [formError, setFormError] = useState<TranslationKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const google = useGoogleSignIn(next);

  const emailRef = useRef<InputRef>(null);
  const passwordRef = useRef<InputRef>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<InputRef>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleBlur = (e: React.FocusEvent<InputRef>): void => {
    const { name, value } = e.target;
    if (!value) return;
    const errors = validateLogin({ ...formData, [name]: value });
    setFieldErrors((prev) => ({ ...prev, [name]: errors[name as LoginField] }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setFormError(null);
    const errors = validateLogin(formData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      (errors.email ? emailRef : passwordRef).current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const { user, token } = await UserService.authenticateUser(formData.email.trim(), formData.password);
      login(user, token);
      navigate(safeNextPath(next), { replace: true });
    } catch (err) {
      const key = scopedMessageKeyForError(err, LOGIN_ERROR_CODES, 'auth.login.error');
      setFormError(key);
      if (key === 'errors.INVALID_CREDENTIALS') {
        setFormData((prev) => ({ ...prev, password: '' }));
        passwordRef.current?.focus();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const shownError = formError ?? google.error;
  const registerPath = next ? `/register?next=${encodeURIComponent(next)}` : '/register';

  return (
    <AuthLayout
      brandTitle={next ? t('auth.login.brandTitleNext') : t('auth.login.brandTitle')}
      benefits={[t('auth.login.benefitFollow'), t('auth.login.benefitSubmit'), t('auth.login.benefitResults')]}
      backLink={{ to: '/', label: t('auth.layout.backHome') }}
      title={t('auth.login.title')}
    >
      <p className="ly-auth__alt">
        <span>{t('auth.login.noAccount')}</span>
        <Link to={registerPath}>{t('auth.login.createOne')}</Link>
      </p>
      {RUNTIME_CONFIG.GOOGLE_CLIENT_ID && (
        <>
          <GoogleButton
            label={t('auth.google.continue')}
            onToken={google.onToken}
            onError={google.onError}
            disabled={submitting || google.busy}
          />
          <div className="ly-auth__separator">
            <span>{t('auth.google.separator')}</span>
          </div>
        </>
      )}
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
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={fieldErrors.email && t(fieldErrors.email)}
        />
        <TextField
          ref={passwordRef}
          type="password"
          name="password"
          size="lg"
          label={t('auth.fields.password')}
          placeholder={t('auth.fields.passwordPlaceholder')}
          showPasswordLabel={t('auth.fields.showPassword')}
          hidePasswordLabel={t('auth.fields.hidePassword')}
          autoComplete="current-password"
          required
          value={formData.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={fieldErrors.password && t(fieldErrors.password)}
        />
        <Link className="ly-auth__aside-link" to="/forgot-password" state={{ email: formData.email.trim() }}>
          {t('auth.login.forgot')}
        </Link>
        {shownError && <Callout tone="error">{t(shownError)}</Callout>}
        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={submitting}
          loadingLabel={t('auth.login.submitting')}
          disabled={google.busy}
        >
          {t('auth.login.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
