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
});
