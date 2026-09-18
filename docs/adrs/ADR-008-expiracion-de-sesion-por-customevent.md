# ADR-008: Manejo global de expiración de sesión por CustomEvent

**Estado:** Aceptado (implementado)
**Fecha:** 2026-09-18 (documentado retroactivamente)
**Detectado desde:** `web`
**Tags:** frontend, sesión, ux

---

## Contexto

El JWT vence a las 24 horas. Cuando vence, cualquier request devuelve 401 — y eso puede pasar en
cualquier pantalla, en medio de cualquier tarea.

El problema es dónde se maneja eso. Si cada pantalla tiene que detectar el 401 y reaccionar, la
lógica se repite en decenas de lugares y alguna se va a olvidar. Y si la reacción es
`window.location.reload()` o una redirección dura al login, el usuario pierde el contexto de lo
que estaba haciendo.

Hay una restricción concreta: el cliente HTTP (`src/config/api.ts`) es un módulo, no un componente
de React. **No puede llamar a un hook ni acceder al contexto de autenticación.**

## Decisión

**El cliente HTTP emite un evento del DOM; el contexto de React lo escucha.**

Ante un `401`, `apiRequest` limpia la sesión de `localStorage` y emite un `CustomEvent` llamado
`auth:logout`. `AuthContext` registra un listener en `window` y, al recibirlo, actualiza su estado
para desloguear al usuario **sin recargar la página**.

**Implementado en:**
- `web` — `src/config/api.ts` (emisión) y `src/context/AuthContext.tsx:81-95`
  (suscripción)

## Consecuencias

### Positivas

- **Una sola implementación para toda la aplicación.** Ninguna pantalla tiene que manejar el 401:
  cualquier request que pase por `apiRequest` lo cubre.
- **El usuario mantiene su contexto de navegación.** No hay recarga ni redirección dura: la
  aplicación pasa a estado deslogueado en la misma pantalla. Si estaba viendo un evento, sigue
  viéndolo como visitante.
- **Resuelve limpiamente el cruce entre un módulo y el árbol de React**, sin recurrir a un
  singleton mutable ni a inyectar el contexto en el cliente HTTP.
- **Es el patrón mejor resuelto del frontend.** Vale documentarlo explícitamente para que no se
  rompa por desconocimiento.

### Negativas

- **El acoplamiento es implícito.** Nada en el código conecta visiblemente al emisor con el
  receptor: son dos archivos que coinciden en el string `'auth:logout'`. **Un rename en un lado
  rompe el comportamiento en silencio**, sin error de compilación aunque TypeScript esté en
  `strict`.
- **No es testeable sin un DOM.** Probar el flujo completo requiere entorno de navegador y
  disparar eventos a mano.
- **Depende de `window`**, lo que lo ataría a un entorno de navegador si alguna vez se introdujera
  SSR.
- **Solo cubre lo que pasa por `apiRequest`.** Una llamada a `fetch` directa no dispara el
  deslogueo.

## Alternativas Consideradas

**No hay registro del rationale original.** Alternativas objetivas:

- **Manejar el 401 en cada pantalla** — Repetición en decenas de lugares, con la garantía de que
  alguna se olvida.
- **Un interceptor de Axios con acceso al store** — Lo habitual con Redux o Zustand. Acá no
  aplica: el estado de sesión vive en un Context de React, al que un módulo no puede acceder.
- **Un singleton mutable** al que `AuthContext` registre un callback (`setLogoutHandler`) — Habría
  dado acoplamiento explícito y tipado, evitando el problema del string mágico. Es la alternativa
  más cercana y probablemente mejor.
- **Redirección dura al login** — Lo más simple, a costa del contexto de navegación del usuario,
  que es justamente lo que esta solución preserva.

## Recomendación para quien trabaje sobre esto

Si se toca esto, **extraer `'auth:logout'` a una constante compartida y tipar el evento**. Es un
cambio de diez minutos que elimina la única debilidad seria del patrón.

## Referencias

- Emisión: `web/src/config/api.ts`
- Suscripción: `web/src/context/AuthContext.tsx:81-95`
- Requerimiento: C-08 y NFR-U-02 en `docs/prd/requirements.md`
