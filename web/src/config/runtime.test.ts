// La configuración se resuelve al importar el módulo, así que cada caso lo
// carga de nuevo con jest.isolateModules después de preparar window y env.
import type { RuntimeConfig } from './runtime';

const loadConfig = () => {
  let config: RuntimeConfig | undefined;
  jest.isolateModules(() => {
    config = require('./runtime').RUNTIME_CONFIG;
  });
  return config!;
};

describe('RUNTIME_CONFIG', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.REACT_APP_API_URL;
    delete process.env.REACT_APP_GOOGLE_CLIENT_ID;
    delete window.__CONFIG__;
  });

  afterAll(() => {
    process.env = originalEnv;
    delete window.__CONFIG__;
  });

  it('usa lo que escribió el contenedor en config.js', () => {
    window.__CONFIG__ = { API_URL: 'https://api.example.com', GOOGLE_CLIENT_ID: 'abc.apps.googleusercontent.com' };
    process.env.REACT_APP_API_URL = 'http://build-time:8080';

    expect(loadConfig()).toEqual({
      API_URL: 'https://api.example.com',
      GOOGLE_CLIENT_ID: 'abc.apps.googleusercontent.com',
    });
  });

  it('sin config.js cae a las REACT_APP_* (npm start / make web)', () => {
    process.env.REACT_APP_API_URL = 'http://localhost:18080';
    process.env.REACT_APP_GOOGLE_CLIENT_ID = 'dev-client-id';

    expect(loadConfig()).toEqual({
      API_URL: 'http://localhost:18080',
      GOOGLE_CLIENT_ID: 'dev-client-id',
    });
  });

  it('un valor vacío en config.js no pisa el fallback', () => {
    // El contenedor arrancado sin -e API_URL escribe cadenas vacías.
    window.__CONFIG__ = { API_URL: '', GOOGLE_CLIENT_ID: '' };
    process.env.REACT_APP_API_URL = 'http://localhost:18080';

    expect(loadConfig().API_URL).toBe('http://localhost:18080');
  });

  it('sin nada configurado apunta a la api local y deja Google deshabilitado', () => {
    expect(loadConfig()).toEqual({ API_URL: 'http://localhost:8080', GOOGLE_CLIENT_ID: '' });
  });

  it('saca la barra final de la URL, para no armar rutas con //', () => {
    window.__CONFIG__ = { API_URL: 'https://api.example.com/' };

    expect(loadConfig().API_URL).toBe('https://api.example.com');
  });
});
