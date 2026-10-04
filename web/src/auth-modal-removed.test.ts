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
