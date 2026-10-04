import type { TranslationKey } from '../i18n/types';

export const PASSWORD_MIN_LENGTH = 8;
export const DISPLAY_NAME_MIN_LENGTH = 3;
export const DISPLAY_NAME_MAX_LENGTH = 100;

export type FieldErrors<K extends string> = Partial<Record<K, TranslationKey>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (value: string): boolean => EMAIL_PATTERN.test(value.trim());

const emailError = (email: string): TranslationKey | undefined =>
  isValidEmail(email) ? undefined : 'auth.validation.emailInvalid';

const passwordMinError = (password: string): TranslationKey | undefined =>
  password.length < PASSWORD_MIN_LENGTH ? 'auth.validation.passwordMin' : undefined;

const compact = <K extends string>(errors: FieldErrors<K>): FieldErrors<K> =>
  Object.fromEntries(Object.entries(errors).filter(([, v]) => v !== undefined)) as FieldErrors<K>;

export const validateLogin = ({
  email,
  password,
}: {
  email: string;
  password: string;
}): FieldErrors<'email' | 'password'> =>
  compact({
    email: emailError(email),
    password: password ? undefined : 'auth.validation.passwordRequired',
  });

export const validateRegister = ({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}): FieldErrors<'name' | 'email' | 'password'> => {
  const trimmed = name.trim();
  let nameError: TranslationKey | undefined;
  if (!trimmed) nameError = 'auth.validation.nameRequired';
  else if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) nameError = 'auth.validation.nameMax';
  return compact({ name: nameError, email: emailError(email), password: passwordMinError(password) });
};

export const validateNewPassword = ({
  password,
  confirm,
}: {
  password: string;
  confirm: string;
}): FieldErrors<'password' | 'confirm'> => {
  const min = passwordMinError(password);
  return compact({
    password: min,
    confirm: !min && confirm !== password ? 'auth.validation.passwordMismatch' : undefined,
  });
};

export const validateDisplayName = (name: string): TranslationKey | undefined => {
  const length = name.trim().length;
  if (length < DISPLAY_NAME_MIN_LENGTH) return 'auth.validation.nameMin';
  if (length > DISPLAY_NAME_MAX_LENGTH) return 'auth.validation.nameMax';
  return undefined;
};
