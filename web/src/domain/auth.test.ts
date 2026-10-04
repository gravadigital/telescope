import {
  isValidEmail,
  validateLogin,
  validateRegister,
  validateNewPassword,
  validateDisplayName,
} from './auth';

describe('dominio de auth', () => {
  it('TS-1: email válido', () => {
    expect(isValidEmail('ana@example.com')).toBe(true);
    expect(isValidEmail(' ana@example.com ')).toBe(true);
    expect(isValidEmail('ana@')).toBe(false);
    expect(isValidEmail('ana example.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('   ')).toBe(false);
  });

  it('TS-2: validación de login', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({
      email: 'auth.validation.emailInvalid',
      password: 'auth.validation.passwordRequired',
    });
    expect(validateLogin({ email: 'ana@example.com', password: 'x' })).toEqual({});
  });

  it('TS-3: validación de registro', () => {
    expect(validateRegister({ name: '  ', email: 'ana@', password: '1234567' })).toEqual({
      name: 'auth.validation.nameRequired',
      email: 'auth.validation.emailInvalid',
      password: 'auth.validation.passwordMin',
    });
    expect(validateRegister({ name: 'Ana Pérez', email: 'ana@example.com', password: '12345678' })).toEqual({});
    expect(validateRegister({ name: 'x'.repeat(101), email: 'ana@example.com', password: '12345678' })).toEqual({
      name: 'auth.validation.nameMax',
    });
  });

  it('TS-4: validación de nueva contraseña', () => {
    expect(validateNewPassword({ password: '1234567', confirm: '1234567' })).toEqual({
      password: 'auth.validation.passwordMin',
    });
    expect(validateNewPassword({ password: 'secreto123', confirm: 'secreto124' })).toEqual({
      confirm: 'auth.validation.passwordMismatch',
    });
    expect(validateNewPassword({ password: 'secreto123', confirm: 'secreto123' })).toEqual({});
  });

  it('TS-5: validación del nombre', () => {
    expect(validateDisplayName('Al')).toBe('auth.validation.nameMin');
    expect(validateDisplayName('  Al  ')).toBe('auth.validation.nameMin');
    expect(validateDisplayName('Leo Gómez')).toBeUndefined();
    expect(validateDisplayName('María')).toBeUndefined();
    expect(validateDisplayName('x'.repeat(101))).toBe('auth.validation.nameMax');
  });
});
