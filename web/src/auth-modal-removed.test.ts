import fs from 'fs';
import path from 'path';

const SRC = __dirname;
// Los nombres se arman por partes para que este archivo no cuente como referencia.
const NAMES = ['openAuth' + 'Modal', 'registerAuth' + 'ModalHandler'];

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });

describe('fin del modal de autenticación', () => {
  it('TS-64: no queda ninguna referencia al modal de auth', () => {
    const offenders = walk(SRC)
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .filter((f) => NAMES.some((n) => fs.readFileSync(f, 'utf8').includes(n)));
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });
});

describe('fin de los modales de autenticación (S-012)', () => {
  const exists = (rel: string): boolean => fs.existsSync(path.join(SRC, rel));
  // Nombres armados por partes para que este archivo no cuente como referencia.
  const removedNames = ['Username' + 'Modal', 'ForgotPassword' + 'Form', 'Auth' + 'Form', 'TAuth' + 'Form', 'Auth' + 'Props'];

  it('TS-59: los archivos del modal ya no existen y nada los referencia', () => {
    [
      'components/auth/Auth.tsx',
      'components/auth/Auth.css',
      'components/auth/ForgotPasswordForm.tsx',
      'components/auth/UsernameModal.tsx',
      'components/auth/GoogleLoginButton.tsx',
      'components/auth-form/AuthForm.tsx',
      'pages/auth-page/AuthPage.tsx',
    ].forEach((rel) => expect(exists(rel)).toBe(false));

    const offenders = walk(SRC)
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .filter((f) => f !== __filename)
      .filter((f) => removedNames.some((n) => new RegExp(`\\b${n}\\b`).test(fs.readFileSync(f, 'utf8'))));
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });

  it('TS-59: Modal se eliminó (lo reemplaza Dialog) y LinkButton sigue (lo usa ManageEventPage)', () => {
    expect(exists('components/modal/Modal.tsx')).toBe(false);
    expect(exists('components/link-button/LinkButton.tsx')).toBe(true);
  });
});
