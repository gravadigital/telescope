import fs from 'fs';
import path from 'path';

const SRC = __dirname;

// Las rutas se arman por partes para que el test no cuente como referencia al código borrado.
const removed = [
  ['components', 'api-status' + '-auth', 'ApiStatus' + 'Auth.tsx'],
  ['components', 'voting', 'Vot' + 'ing.tsx'],
  ['components', 'event-detail', 'EventDetail.tsx'],
  ['components', 'Share' + 'Button.tsx'],
  ['components', 'Share' + 'Button.css'],
  ['components', 'partici' + 'pants'],
  ['components', 'voting-results' + '-panel'],
  ['components', 'mo' + 'dal'],
  ['components', 'stage-advance' + '-modal'],
  ['components', 'voting-configuration' + '-panel'],
  ['components', 'event' + '-timeline'],
  ['components', 'link' + '-button'],
];

const read = (...parts: string[]): string => fs.readFileSync(path.join(SRC, ...parts), 'utf8');

describe('código muerto', () => {
  it('TS-61: el listado viejo y el HomePage placeholder fueron eliminados', () => {
    ['Events.tsx', 'Events.css', 'Events.test.tsx'].forEach((file) =>
      expect(fs.existsSync(path.join(SRC, 'components', 'events', file))).toBe(false)
    );
    const app = read('App.tsx');
    expect(app).not.toContain('function ' + 'HomePage');
    expect(app).not.toContain('function ' + 'EventsPage');
    expect(app).not.toContain('WHY' + '?');
    const css = read('App.css');
    expect(css).not.toContain('.main-' + 'content');
    expect(css).not.toMatch(/\.section\b/);
    const api = read('services', 'api.ts');
    expect(api).not.toContain('getAll' + 'Events');
  });

  it('TS-94: los componentes sin uso fueron eliminados', () => {
    removed.forEach((parts) => expect(fs.existsSync(path.join(SRC, ...parts))).toBe(false));
  });

  it('TS-80: el detalle ya no avanza etapas ni usa los modales viejos', () => {
    const app = read('App.tsx');
    expect(app).not.toContain('EventDetailPage' + 'Wrapper');
    const page = read('pages', 'event-detail', 'EventDetailPage.tsx');
    ['StageAdvance' + 'Modal', 'VotingConfiguration' + 'Panel', 'updateEvent' + 'Stage', 'err' + '.message', 'console' + '.log'].forEach(
      (word) => expect(page).not.toContain(word)
    );
    const api = read('services', 'api.ts');
    expect(api).not.toContain('getShareable' + 'EventInfo');
  });

  it('TS-88: la gestión no usa los modales viejos ni los servicios deprecados', () => {
    const page = read('pages', 'manage-event', 'ManageEventPage.tsx');
    [
      'StageAdvance' + 'Modal',
      'VotingConfiguration' + 'Panel',
      'EditDeadline' + 'Modal',
      'window' + '.confirm',
      'err' + '.message',
      'console' + '.log',
    ].forEach((word) => expect(page).not.toContain(word));
    const api = read('services', 'api.ts');
    ['generate' + 'Assignments', 'createVoting' + 'Config', 'getEvent' + 'Participants'].forEach((word) =>
      expect(api).not.toContain(word)
    );
  });

  it('TS-89: las reglas de avance de etapa viven solo en src/domain', () => {
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
        const full = path.join(dir, d.name);
        if (d.isDirectory()) return d.name === 'domain' ? [] : walk(full);
        return /\.tsx?$/.test(d.name) && !/\.test\.tsx?$/.test(d.name) ? [full] : [];
      });
    const offenders = walk(SRC).filter((f) =>
      /(function|const)\s+(validateStage\s*Advance|getNext\s*Stage)\b/.test(fs.readFileSync(f, 'utf8'))
    );
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });
});
