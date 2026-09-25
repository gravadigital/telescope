// Configuración que se decide al arrancar el contenedor, no al construir la imagen.
//
// Create React App reemplaza cada process.env.REACT_APP_* por su valor literal en el
// build, así que una imagen construida con una URL queda atada a esa instalación. Para
// que la imagen publicada sirva en cualquier lado, el contenedor escribe
// /config.js al iniciar (web/docker/40-runtime-config.sh) con window.__CONFIG__, y
// index.html lo carga antes que la app.
//
// Sin contenedor —npm start, make web, los tests— config.js es el vacío de public/ y
// se cae a las REACT_APP_* de siempre.

export interface RuntimeConfig {
  API_URL: string;
  GOOGLE_CLIENT_ID: string;
}

declare global {
  interface Window {
    __CONFIG__?: Partial<RuntimeConfig>;
  }
}

const fromContainer = (typeof window !== 'undefined' && window.__CONFIG__) || {};

export const RUNTIME_CONFIG: RuntimeConfig = {
  // `||` y no `??`: un contenedor arrancado sin la variable escribe una cadena vacía.
  API_URL: (fromContainer.API_URL || process.env.REACT_APP_API_URL || 'http://localhost:8080').replace(/\/+$/, ''),
  GOOGLE_CLIENT_ID: fromContainer.GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
};
