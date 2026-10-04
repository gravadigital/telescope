import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../components/layout/auth-layout/AuthLayout';
import GoogleButton from '../../components/auth/google-button/GoogleButton';
import { Button, Callout, TextField } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { DISPLAY_NAME_MAX_LENGTH, safeNextPath, validateRegister } from '../../domain';
import type { FieldErrors } from '../../domain';
import { ApiError } from '../../config/api';
import { scopedMessageKeyForError, useT } from '../../i18n';
import type { TranslationKey } from '../../i18n';
import { RUNTIME_CONFIG } from '../../config/runtime';
import { useGoogleSignIn } from '../../hooks/useGoogleSignIn';
import { UserService } from '../../services/api';

type RegisterField = 'name' | 'email' | 'password';
type InputRef = HTMLInputElement | HTMLTextAreaElement;

const FIELD_ORDER: RegisterField[] = ['name', 'email', 'password'];

const RegisterPage: React.FC = () => {
  const { t } = useT();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');

  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<RegisterField>>({});
  const [formError, setFormError] = useState<TranslationKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const google = useGoogleSignIn(next);

  const refs: Record<RegisterField, React.RefObject<InputRef | null>> = {
    name: useRef<InputRef>(null),
    email: useRef<InputRef>(null),
    password: useRef<InputRef>(null),
  };

  useEffect(() => {
    refs.name.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<InputRef>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleBlur = (e: React.FocusEvent<InputRef>): void => {
    const { name, value } = e.target;
    if (!value.trim()) return;
    const errors = validateRegister({ ...formData, [name]: value });
    setFieldErrors((prev) => ({ ...prev, [name]: errors[name as RegisterField] }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setFormError(null);
    const errors = validateRegister(formData);
    const firstInvalid = FIELD_ORDER.find((field) => errors[field]);
    if (firstInvalid) {
      setFieldErrors(errors);
      refs[firstInvalid].current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const { user, token } = await UserService.createUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });
      login(user, token);
      navigate(safeNextPath(next), { replace: true });
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      if (code === 'EMAIL_ALREADY_EXISTS') {
        setFieldErrors({ email: 'auth.register.emailTaken' });
        refs.email.current?.focus();
      } else if (code === 'INVALID_PASSWORD') {
        setFieldErrors({ password: 'errors.INVALID_PASSWORD' });
        refs.password.current?.focus();
      } else {
        setFormError(scopedMessageKeyForError(err, ['INVALID_PAYLOAD'], 'auth.register.error'));
        setFormData((prev) => ({ ...prev, password: '' }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const shownError = formError ?? google.error;
  const loginPath = next ? `/login?next=${encodeURIComponent(next)}` : '/login';

  return (
    <AuthLayout
      brandTitle={t('auth.register.brandTitle')}
      benefits={[t('auth.register.benefitJoin'), t('auth.register.benefitEvaluate'), t('auth.register.benefitCreate')]}
      backLink={{ to: '/', label: t('auth.layout.backHome') }}
      title={t('auth.register.title')}
    >
      <p className="ly-auth__alt">
        <span>{t('auth.register.haveAccount')}</span>
        <Link to={loginPath}>{t('auth.register.login')}</Link>
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
          ref={refs.name}
          name="name"
          size="lg"
          label={t('auth.fields.fullName')}
          placeholder={t('auth.fields.fullNamePlaceholder')}
          autoComplete="name"
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          required
          value={formData.name}
          onChange={handleChange}
          onBlur={handleBlur}
          error={fieldErrors.name && t(fieldErrors.name)}
        />
        <TextField
          ref={refs.email}
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
          ref={refs.password}
          type="password"
          name="password"
          size="lg"
          label={t('auth.fields.password')}
          placeholder={t('auth.fields.newPasswordPlaceholder')}
          help={t('auth.fields.passwordRule')}
          showPasswordLabel={t('auth.fields.showPassword')}
          hidePasswordLabel={t('auth.fields.hidePassword')}
          autoComplete="new-password"
          required
          value={formData.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={fieldErrors.password && t(fieldErrors.password)}
        />
        {shownError && <Callout tone="error">{t(shownError)}</Callout>}
        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={submitting}
          loadingLabel={t('auth.register.submitting')}
          disabled={google.busy}
        >
          {t('auth.register.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
