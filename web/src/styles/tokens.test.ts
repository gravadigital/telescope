import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(SRC, ...parts), 'utf8');

const DEF = /(--[a-z0-9-]+)\s*:/g;
const definedNames = (css: string): Set<string> => {
  const names = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(DEF.source, 'g');
  while ((m = re.exec(css)) !== null) names.add(m[1]);
  return names;
};

const listCss = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return listCss(full);
    return e.name.endsWith('.css') ? [full] : [];
  });

describe('tokens.css', () => {
  it('TS-1: define los tokens del DS', () => {
    const css = read('styles', 'tokens.css');
    [
      '--ref-color-violet-700: #4B3FA8',
      '--ref-color-cyan-400: #35D6F2',
      '--bg-action-primary: var(--ref-color-violet-700)',
      '--text-primary: var(--ref-color-ink-900)',
      '--radius-surface: var(--ref-radius-2xl)',
      '--ref-radius-2xl: 18px',
      '--button-primary-bg: var(--bg-action-primary)',
      '--status-pill-success-bg: var(--bg-success-subtle)',
      '--ref-bp-desktop: 768px',
      '--bp-mobile: 768px',
      '--ref-font-size-md: 0.9375rem',
    ].forEach((decl) => expect(css).toContain(decl));
    expect((css.match(/:root\s*\{/g) || []).length).toBe(1);
  });

  it('TS-2: index.css ya no define tokens ni importa estilos legacy', () => {
    const css = read('index.css');
    expect(css).not.toMatch(/^\s*--[a-z0-9-]+\s*:/m);
    expect(css).not.toContain('global.css');
  });

  it('TS-3: el bloque legacy v1.0 ya no existe', () => {
    expect(fs.existsSync(path.join(SRC, 'styles', 'global.css'))).toBe(false);
    expect(fs.existsSync(path.join(SRC, 'App.css'))).toBe(false);
  });

  it('TS-4: ningún var(--x) sin definición en los CSS', () => {
    const files = listCss(SRC);
    const defined = new Set<string>();
    files.forEach((f) => definedNames(fs.readFileSync(f, 'utf8')).forEach((n) => defined.add(n)));
    const orphans: string[] = [];
    files.forEach((f) => {
      const css = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      const re = /var\(\s*(--[a-z0-9-]+)\s*(,[^)]*)?\)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(css)) !== null) {
        if (!m[2] && !defined.has(m[1])) orphans.push(`${path.relative(SRC, f)}: ${m[1]}`);
      }
    });
    expect(orphans).toEqual([]);
  });

  it('TS-5: ningún otro CSS define tokens', () => {
    const skip = [path.join(SRC, 'styles', 'tokens.css')];
    const offenders = listCss(SRC)
      .filter((f) => !skip.includes(f))
      .filter((f) => /^\s*--[a-z0-9-]+\s*:/m.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
