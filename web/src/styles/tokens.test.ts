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

  it('TS-2: index.css ya no define tokens', () => {
    const css = read('index.css');
    expect(css).not.toMatch(/^\s*--[a-z0-9-]+\s*:/m);
    expect(css.trimStart().startsWith("@import './styles/global.css';")).toBe(true);
  });

  it('TS-3: bloque legacy único en global.css', () => {
    const css = read('styles', 'global.css');
    expect((css.match(/:root\s*\{/g) || []).length).toBe(1);
    const start = css.indexOf(':root {');
    const end = css.indexOf('\n}', start);
    const before = css.slice(0, start);
    expect(before).toContain('LEGACY');
    // Única excepción: el override responsive de variables legacy, dentro de @media y con :is(:root).
    const outside = (css.slice(0, start) + css.slice(end)).replace(/:is\(:root\)\s*\{[^}]*\}/g, '');
    expect(outside).not.toMatch(/^\s*--[a-z0-9-]+\s*:/m);
  });

  it('TS-4: sin colisión entre tokens nuevos y legacy', () => {
    const a = definedNames(read('styles', 'tokens.css'));
    const b = definedNames(read('styles', 'global.css'));
    const common = Array.from(a).filter((n) => b.has(n));
    expect(common).toEqual([]);
  });

  it('TS-5: ningún otro CSS define tokens', () => {
    const skip = [path.join(SRC, 'styles', 'tokens.css'), path.join(SRC, 'styles', 'global.css')];
    const offenders = listCss(SRC)
      .filter((f) => !skip.includes(f))
      .filter((f) => /^\s*--[a-z0-9-]+\s*:/m.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('TS-6: fallbacks de StageAdvanceModal.css neutralizados', () => {
    const css = read('components', 'stage-advance-modal', 'StageAdvanceModal.css');
    expect(css).not.toContain('var(--text-primary');
    expect(css).not.toContain('var(--text-secondary');
  });
});
