/** @jest-environment node */
import path from 'path';
import { spawnSync } from 'child_process';

/**
 * Verifica la regla `react/jsx-no-literals` (CA-6). Cada story de pantalla agrega su
 * carpeta al `override` de `eslintConfig` (package.json) y al script `lint`.
 */
const WEB_ROOT = path.resolve(__dirname, '../..');
const ESLINT_BIN = path.join(WEB_ROOT, 'node_modules/eslint/bin/eslint.js');

/**
 * Corre ESLint en un proceso aparte con la resolución de módulos de Node: el resolver de
 * Jest 27 no entiende los `exports` de `@rushstack/eslint-patch` (usado por react-app).
 */
const literalErrors = async (code: string, filePath: string) => {
  const run = spawnSync(
    process.execPath,
    [ESLINT_BIN, '--stdin', '--stdin-filename', path.join(WEB_ROOT, filePath), '-f', 'json'],
    { cwd: WEB_ROOT, input: code, encoding: 'utf8' }
  );
  const [result] = JSON.parse(run.stdout) as Array<{ messages: Array<{ ruleId: string | null; severity: number }> }>;
  return result.messages.filter((m) => m.ruleId === 'react/jsx-no-literals');
};

const HOLA = 'const A = () => <p>Hola mundo</p>; export default A;';

describe('react/jsx-no-literals', () => {
  jest.setTimeout(30000);

  it('TS-29: dispara en components/layout', async () => {
    const msgs = await literalErrors(HOLA, 'src/components/layout/fake/Fake.tsx');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].severity).toBe(2);
  });

  it('TS-30: dispara en pages/not-found y components/ui', async () => {
    expect(await literalErrors(HOLA, 'src/pages/not-found/Fake.tsx')).toHaveLength(1);
    expect(await literalErrors(HOLA, 'src/components/ui/fake/Fake.tsx')).toHaveLength(1);
  });

  it('TS-31: texto del catálogo y puntuación permitida', async () => {
    const file = 'src/components/layout/fake/Fake.tsx';
    expect(await literalErrors("const A = () => <p>{t('nav.events')}</p>; export default A;", file)).toHaveLength(0);
    expect(await literalErrors('const A = () => <span>·</span>; export default A;', file)).toHaveLength(0);
    expect(await literalErrors('const A = () => <span>/</span>; export default A;', file)).toHaveLength(0);
  });

  it('TS-32: fuera del alcance no dispara', async () => {
    expect(await literalErrors(HOLA, 'src/pages/event-detail/Fake.tsx')).toHaveLength(0);
  });

  it('TS-60: dispara en las carpetas de las páginas de auth', async () => {
    expect(await literalErrors(HOLA, 'src/pages/login/Fake.tsx')).toHaveLength(1);
    expect(await literalErrors(HOLA, 'src/pages/complete-profile/Fake.tsx')).toHaveLength(1);
    expect(await literalErrors(HOLA, 'src/components/auth/fake/Fake.tsx')).toHaveLength(1);
  });
});
