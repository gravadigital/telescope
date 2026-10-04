import { loginPathFor, safeNextPath } from './redirect';

describe('safeNextPath', () => {
  it('TS-51: acepta rutas internas', () => {
    ['/events/create', '/events/evt-1/manage?tab=participants', '/my-events#x'].forEach((p) =>
      expect(safeNextPath(p)).toBe(p)
    );
  });

  it('TS-52: rechaza externas y vacías', () => {
    [null, undefined, '', 'https://otro-sitio.com', '//otro-sitio.com', '/\\otro-sitio.com', 'javascript:alert(1)', 'events'].forEach(
      (p) => expect(safeNextPath(p)).toBe('/events')
    );
  });
});

describe('loginPathFor', () => {
  it('codifica la ruta', () => {
    expect(loginPathFor('/events/create?from=home')).toBe('/login?next=%2Fevents%2Fcreate%3Ffrom%3Dhome');
  });
});
