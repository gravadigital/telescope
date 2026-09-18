# ADR-003: Backend monolítico con SPA, sin microservicios ni bus de eventos

**Estado:** Aceptado (implementado)
**Fecha:** 2026-09-18 (documentado retroactivamente)
**Detectado desde:** `api`, `web`
**Tags:** arquitectura, servicios, comunicación

---

## Contexto

El producto tiene un dominio acotado: eventos de convocatoria, identidad, propuestas y un
algoritmo de votación. El volumen esperado por evento está en el orden de decenas de participantes
(el tope configurable es 100). No hay integraciones entrantes de terceros ni necesidad de exponer
capacidades a sistemas externos.

La pregunta arquitectónica es cuántos servicios desplegables tiene el sistema y cómo se comunican.

## Decisión

**Dos servicios desplegables, comunicación en un solo sentido.**

- `api` — **el único servicio con estado.** Concentra todo el dominio: ciclo de vida de
  eventos, identidad, propuestas y el motor de votación.
- `web` — SPA que consume la API. **Sin lógica de negocio propia**: refleja lo que la
  API responde.

**No existe comunicación backend-a-backend**, ni bus de eventos, ni colas, ni mensajería
asincrónica. La única integración de datos es `web → api` por HTTP REST con
JWT Bearer.

**Implementado en:**
- `api` — organizado por capacidad de dominio en `internal/domain/{módulo}`, con wiring
  manual y explícito en `cmd/api/main.go`
- `web` — servicios por dominio en `src/services/api.ts` como única frontera con la API

## Consecuencias

### Positivas

- **El algoritmo de votación es una unidad.** El MBC, la calidad del evaluador y los incentivos son
  un solo cálculo que lee toda la tabla de votos del evento. Distribuirlo introduciría consistencia
  eventual **en el único lugar donde el producto necesita ser exacto**.
- **Sin coordinación distribuida.** No hay sagas, ni compensaciones, ni idempotencia de mensajes,
  ni el conjunto de problemas que traen los sistemas distribuidos — ninguno de los cuales el
  producto necesitaba resolver.
- **Las transacciones son locales.** Crear un evento y registrar a su creador como participante
  ocurre en una sola transacción de base.
- **El backend es stateless** (la sesión vive en el JWT): admite escalar horizontalmente detrás de
  un balanceador sin cambios de arquitectura.
- **Una sola suite de tests cubre el dominio completo.**

### Negativas

- **PostgreSQL es el único cuello de botella real**, sin réplicas de lectura ni caché de
  aplicación.
- **El cálculo de resultados es síncrono.** Con el tope actual de 100 participantes no es un
  problema; si ese tope subiera, es lo primero que habría que mover a background.
- **Todo se despliega junto.** Un cambio en el envío de emails obliga a redesplegar el servicio que
  contiene el algoritmo de votación.
- **Sin aislamiento de fallos dentro del backend.** Un problema en el módulo de attachments puede
  afectar la disponibilidad del de votación.

## Alternativas Consideradas

**No hay registro del rationale original.** Alternativas objetivas:

- **Microservicios por dominio** (eventos / identidad / votación) — Habría agregado coordinación
  distribuida sin resolver ningún problema que el producto tenga. El dominio no tiene equipos
  separados que necesiten desplegar independientemente, ni componentes con perfiles de carga
  distintos.
- **Arquitectura orientada a eventos** con un bus — Útil si hubiera múltiples consumidores de los
  cambios de estado del evento. Hoy el único consumidor es el propio backend, que envía emails.
- **Monolito con el frontend servido por el backend** (SSR) — Habría evitado el problema de CORS y
  el manejo de token en `localStorage`, a costa de acoplar los ciclos de despliegue.

## Implicancia para el diseño futuro

**Cualquier documento o diseño que asuma comunicación asincrónica entre servicios de este producto
está describiendo algo que no existe.** Si en algún momento se justifica introducir un bus o un
segundo servicio con estado, eso amerita un ADR nuevo que supersede a este.

## Referencias

- Arquitectura: `docs/prd/architecture.md`
- Servicios: `docs/architectures/api/`, `docs/architectures/web/`
