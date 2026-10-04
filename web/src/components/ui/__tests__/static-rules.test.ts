import fs from 'fs';
import path from 'path';

const COMPONENTS = path.join(__dirname, '..', '..');
const ROOTS = [
  path.join(COMPONENTS, 'ui'),
  path.join(COMPONENTS, 'layout'),
  path.join(COMPONENTS, 'auth'),
  ...['event-hero', 'stage-timeline', 'next-step-card', 'progress-checklist'].map((d) =>
    path.join(COMPONENTS, 'events', d)
  ),
];

const walk = (dir: string): string[] => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
};

const files = ROOTS.flatMap(walk);
const cssFiles = files.filter((f) => f.endsWith('.css'));
const tsxFiles = files.filter(
  (f) => f.endsWith('.tsx') && !/\.test\.tsx$/.test(f) && !f.includes('__tests__')
);

const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');
const rel = (f: string): string => path.relative(COMPONENTS, f);

const SPACING = ['4px', '8px', '12px', '16px', '24px', '28px', '32px', '48px', '0.25rem', '0.5rem', '0.75rem', '1rem', '1.5rem', '1.75rem', '2rem', '3rem'];
const RADIUS = ['6px', '8px', '10px', '12px', '14px', '18px', '999px'];

describe('reglas estáticas de componentes nuevos', () => {
  it('encuentra archivos para chequear', () => {
    expect(cssFiles.length).toBeGreaterThan(0);
  });

  it('TS-7: sin colores literales', () => {
    const offenders = cssFiles.filter((f) => {
      const css = stripComments(fs.readFileSync(f, 'utf8'));
      return /#[0-9a-fA-F]{3,8}\b/.test(css) || /\brgba?\(/.test(css) || /\bhsla?\(/.test(css);
    });
    expect(offenders.map(rel)).toEqual([]);
  });

  it('TS-8: sin medidas sueltas que tengan token', () => {
    const offenders: string[] = [];
    cssFiles.forEach((f) => {
      const css = stripComments(fs.readFileSync(f, 'utf8'));
      const re = /(^|[;{\s])((?:padding|margin)[a-z-]*|gap|row-gap|column-gap|border-radius)\s*:\s*([^;}]+)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(css)) !== null) {
        const prop = m[2];
        const values = m[3].trim().split(/\s+/);
        const list = prop === 'border-radius' ? RADIUS : SPACING;
        values.forEach((v) => {
          if (list.includes(v)) offenders.push(`${rel(f)}: ${prop}: ${m![3].trim()}`);
        });
      }
    });
    expect(offenders).toEqual([]);
  });

  it('TS-9: todos los selectores de clase llevan prefijo', () => {
    const offenders: string[] = [];
    cssFiles.forEach((f) => {
      const css = stripComments(fs.readFileSync(f, 'utf8'));
      const re = /\.([A-Za-z_][\w-]*)/g;
      // Se ignoran los valores (números como 0.5) quitando el contenido de los bloques.
      const selectors = css.replace(/\{[^}]*\}/g, '{}').replace(/@media[^{]*\{/g, '');
      let m: RegExpExecArray | null;
      while ((m = re.exec(selectors)) !== null) {
        if (!/^(ui|ev|ly|au)-/.test(m[1])) offenders.push(`${rel(f)}: .${m[1]}`);
      }
    });
    expect(offenders).toEqual([]);
  });

  it('TS-10: sin texto propio en los componentes', () => {
    const offenders: string[] = [];
    tsxFiles.forEach((f) => {
      const src = fs.readFileSync(f, 'utf8');
      // Texto JSX: sigue a una etiqueta de apertura (evita falsos positivos con genéricos y operadores de TS).
      const jsxText = /(?<![\w$.])<[A-Za-z]([^<>]*[^/<>])?>[^<>{}]*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][^<>{}]*</g;
      const attrs = /(aria-label|title|placeholder|alt)="[^"]*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][^"]*"/g;
      (src.match(jsxText) || []).forEach((t) => offenders.push(`${rel(f)}: ${t.trim()}`));
      (src.match(attrs) || []).forEach((t) => offenders.push(`${rel(f)}: ${t}`));
    });
    expect(offenders).toEqual([]);
  });
});
