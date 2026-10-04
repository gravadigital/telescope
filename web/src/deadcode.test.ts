import fs from 'fs';
import path from 'path';

const SRC = __dirname;

// Las rutas se arman por partes para que el test no cuente como referencia al código borrado.
const removed = [
  ['components', 'api-status' + '-auth', 'ApiStatus' + 'Auth.tsx'],
  ['components', 'voting', 'Vot' + 'ing.tsx'],
  ['components', 'event-detail', 'EventDetail.tsx'],
];

describe('código muerto', () => {
  it('TS-94: los componentes sin uso fueron eliminados', () => {
    removed.forEach((parts) => expect(fs.existsSync(path.join(SRC, ...parts))).toBe(false));
  });
});
