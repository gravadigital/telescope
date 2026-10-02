---
document: User Flows — web
version: "1.0"
date: 2026-09-25
status: as-is-sin-validar
superficie: web
---

# User Flows — `web`

> **Flujos transcriptos del código existente**, inferidos de la navegación relevada cruzada con los
> flujos técnicos de [`docs/flows/`](../../../flows/). Describen lo que el usuario recorre hoy, no
> un diseño propuesto.
>
> Se documentan **4 flujos críticos**, no todos los posibles (Regla 7). Cada uno nombra el JTBD que
> resuelve y cubre los caminos no felices.

---

## UF-01 — Del link compartible a la propuesta entregada

**Audiencia:** participante · **Resuelve:** JTBD-01 (entregar antes de que cierre)
**Pantallas:** S-04, O-02 · **Flujo técnico:** [`registro-y-carga-de-propuesta`](../../../flows/registro-y-carga-de-propuesta.md)

Es el flujo de incorporación del producto. Empieza fuera del sistema: alguien comparte una URL.

```mermaid
graph TD
    A[Recibe el link /events/:id] --> B[S-04 Detalle del evento]
    B --> C{¿Etapa?}
    C -->|creation| D[Aviso: evento en preparación<br/>FIN sin acción posible]
    C -->|participation| E{¿Evento pausado?}
    E -->|sí| F[Aviso de pausa<br/>acciones bloqueadas]
    E -->|no| G{¿Tiene sesión?}
    G -->|no| H[Click Participate<br/>→ abre O-02 login]
    H --> I[Se registra o inicia sesión]
    G -->|sí| J[Click Participate]
    I --> J
    J --> K[Registrado<br/>badge ✅ Registered]
    K --> L[Selecciona archivo]
    L --> M{¿Válido?}
    M -->|>10MB o tipo no permitido| N[Error inline<br/>vuelve a L]
    M -->|sí| O[O-06 Modal de confirmación]
    O --> P[Sube]
    P --> Q[✅ File uploaded successfully!<br/>FIN]

    style D fill:#f59e0b,color:#fff
    style F fill:#f59e0b,color:#fff
    style N fill:#ef4444,color:#fff
    style Q fill:#22c55e,color:#fff
```

### Caminos no felices

| Situación | Qué ve el usuario | Estado |
|---|---|---|
| Etapa `creation` | `🔭 This event is being set up. Come back when it opens for participation.` | Bien resuelto |
| Evento pausado | `⏸ Registration and file submissions are not available while the event is paused.` | Bien resuelto |
| Cupo completo | Mensaje crudo de la API | Aceptable |
| Archivo >10 MB | `File cannot exceed 10MB` | Bien resuelto |
| Tipo no permitido | `File type not allowed. Use: JPEG, PNG, GIF, WebP, PDF, TXT, DOC, DOCX` | Bien resuelto |
| Ya entregó | `✅ Submission received` — no se ofrece subir otra | Bien resuelto |
| Falla la carga del evento | Pantalla completa de error con dos vías de recuperación | Bien resuelto |

**Observación:** es el flujo mejor cubierto del producto. Los estados de bloqueo están todos
contemplados y explicados.

⚠️ **Salvo uno:** el mensaje de error dice `10MB` y la línea de requisitos dice `Max 10 MB`.
Inconsistencia menor de microcopy.

---

## UF-02 — Evaluar las propuestas asignadas

**Audiencia:** participante · **Resuelve:** JTBD-02 (cumplir con la evaluación)
**Pantallas:** S-04 → O-12 · **Flujo técnico:** [`evaluacion-y-envio-de-ranking`](../../../flows/evaluacion-y-envio-de-ranking.md)
**Modificado por:** REQ-002 (apertura de propuestas con la sesión)

```mermaid
graph TD
    A[Recibe email: el evento pasó a votación] --> B[S-04 Detalle del evento]
    B --> C{¿Tiene asignación?}
    C -->|no| D[No se muestra el panel<br/>sin explicación]
    C -->|sí, pendiente| E[O-12 Panel de ranking]
    E --> F[Ve m propuestas:<br/>nombre, fecha, tamaño]
    F --> G[📥 Download / View File<br/>con su sesión]
    G --> H{¿La API permite la descarga?}
    H -->|sí| J[Abre el archivo]
    H -->|403 / 404| I[Error inline en el panel<br/>el ranking no se pierde]
    I --> F
    J --> L[Lee y ordena]
    L --> M[Autoguardado de borrador]
    M --> N{¿Termina ahora?}
    N -->|no| O[Abandona<br/>el borrador queda guardado]
    O --> B
    N -->|sí| P[Envía el ranking]
    P --> Q[✅ Assignment Completed<br/>IRREVERSIBLE]
    Q --> R[Sigue viendo sus propuestas<br/>en solo lectura, descargables<br/>mientras dure voting]

    style I fill:#f59e0b,color:#fff
    style D fill:#f59e0b,color:#fff
    style Q fill:#22c55e,color:#fff
```

### La ventana de descarga del evaluador

El evaluador puede abrir las propuestas de su Asignación **mientras el evento está en `voting` y no
está cancelado**, haya enviado o no su ranking. **Pausar no corta la ventana**, porque la pausa es
temporal. La ventana se cierra cuando el evento pasa a `results` o se cancela. La API revisa esta
regla en cada descarga (REQ-002, RF-1).

Antes de REQ-002 el enlace tenía `http://localhost:8080` hardcodeado y en producción el evaluador
ordenaba **sin leer las propuestas**. Un ranking así no mide calidad, y tampoco el `Q_i` que se
deriva de él. Ese defecto está cerrado: la apertura con sesión es el paso que le da sentido al resto
del flujo.

### Caminos no felices

| Situación | Qué ve el usuario | Estado |
|---|---|---|
| Sin asignación | El panel simplemente no aparece | ⚠️ **Sin explicación.** No se distingue "no te tocó" de "todavía no se generaron" |
| Descarga rechazada (`403`), por ejemplo si el evento se canceló durante la votación | `Failed to download "{archivo}": You are not authorized to download this attachment.` inline en el panel | Bien resuelto (REQ-002) |
| Archivo inexistente (`404`) | `Failed to download "{archivo}": File not found in storage.` inline | Bien resuelto (REQ-002) |
| Sesión expirada (`401`) | Logout global y modal de login (ADR-008) | Bien resuelto |
| Evento pausado | Descarga igual que sin pausa | Bien resuelto (REQ-002) |
| Abandona a mitad | El borrador se guarda solo | Bien resuelto |
| Rangos inválidos | Mensaje crudo del backend | Aceptable |
| Ya votó | No admite reenvío. Sigue viendo sus propuestas en solo lectura y puede abrirlas | Correcto, pero **irreversible sin advertencia previa** |

**Lo mejor resuelto:** el autoguardado con debounce del borrador. Abandonar no cuesta nada.

**Lo peor resuelto:** el envío es irreversible y **no hay ninguna confirmación previa** que lo
advierta. Contrasta con la subida de archivo (UF-01), que sí pide confirmación en un modal para una
acción menos definitiva.

---

## UF-03 — Conducir el evento de principio a fin

**Audiencia:** organizador · **Resuelve:** JTBD-01 y JTBD-02 (abrir y conducir)
**Pantallas:** S-03 → S-05 → O-05, O-09 · **Flujos técnicos:**
[`avance-de-etapa`](../../../flows/avance-de-etapa-del-evento.md),
[`configuracion-y-generacion-de-asignaciones`](../../../flows/configuracion-y-generacion-de-asignaciones.md)

```mermaid
graph TD
    A[S-02 Click Create Event] --> B[S-03 Formulario]
    B --> C[Crea el evento<br/>⚠️ la fecha se autogenera sin verla]
    C --> D[S-04 → redirect → S-05 Gestión]
    D --> E[Comparte el link]
    E --> F[Etapa creation]
    F --> G[O-05 Avanzar a participation<br/>+ fijar deadline]
    G --> H[Participantes se registran y entregan]
    H --> I{¿Avanza a voting?}
    I -->|valida: hay participantes| J[O-05 Avanzar a voting]
    J --> K[O-09 Configurar votación<br/>m recomendado precargado]
    K --> L[Generar asignaciones<br/>IRREVERSIBLE]
    L --> M[✅ Voting is underway]
    M --> N{¿Todos votaron?}
    N -->|no| O[Cannot advance: Only x of y voted]
    N -->|sí| P[O-05 Avanzar a results]
    P --> Q[O-10 Panel de resultados]

    style C fill:#f59e0b,color:#fff
    style L fill:#ef4444,color:#fff
    style O fill:#f59e0b,color:#fff
```

### Caminos no felices

| Situación | Qué ve el organizador | Estado |
|---|---|---|
| Sin participantes al avanzar | `Cannot advance: No participants registered yet.` | Bien resuelto **solo desde S-05** |
| Votación incompleta | `Cannot advance: Only {x} of {y} participants have voted.` | Bien resuelto **solo desde S-05** |
| No es el creador | `You do not have permission to manage this event.` | **El único estado de permiso explícito del producto** |
| Sin sesión | Redirige a `/events` **sin ningún mensaje** | ⚠️ Deficiente |
| `m` fuera de rango | Mensaje crudo del backend | Aceptable |
| Umbrales inválidos | **Error 500 genérico** (CHECK de base) | ⚠️ Malo |
| Falla una carga secundaria | **Nada: se ven datos falsos o vacíos** | ⚠️ **Crítico** |

> **Desde REQ-002 solo el creador conduce el evento.** Se retiró el rol global `users.role`: ya no
> hay `admin` que saltee los permisos ni `organizer` que configure la votación de un evento ajeno.
> Avanzar la etapa, pausar, posponer el deadline, configurar la votación y generar asignaciones
> exigen ser el autor del evento. Los pasos del flujo no cambian.

### Los tres problemas de este flujo

1. **Las validaciones de avance dependen de la pantalla.** Desde S-05 se valida; **desde S-04 el
   mismo avance no valida nada**. Un organizador que llegue por el camino equivocado puede cerrar
   la votación con evaluaciones pendientes — y quien no completó recibe `Q_i = 0` y su propuesta
   baja `n` posiciones.

   **Neutralizado por REQ-002:** el avance desde S-04 solo lo veía un `admin` que no era creador
   (el creador es redirigido a S-05). Sin rol global, nadie llega a ese botón. El código sigue ahí.

2. **No hay confirmación de éxito en toda S-05.** Tras avanzar de etapa, pausar o cambiar un
   deadline, **el único feedback es que los datos se recargan**. S-04 sí muestra
   `Stage updated to: {etapa}`.

3. **Generar asignaciones es irreversible y no lo advierte.** No hay endpoint para rehacerlas. Si
   la configuración estaba mal, no hay camino de vuelta.

### Una capability sin flujo

**C-16 (cancelar evento) no tiene ningún control en la interfaz.** Verificado: los únicos botones
"Cancel" del frontend cierran formularios y modales. El backend expone `PATCH /cancel` y dispara
emails de cancelación, pero **el organizador no tiene forma de ejecutarlo**. La UI solo muestra el
badge `CANCELLED` si el evento ya lo está — un estado al que no se puede llegar desde el producto.

---

## UF-04 — Recuperar el acceso

**Audiencia:** participante · **Resuelve:** habilitador de todos los JTBD
**Pantallas:** O-02 → O-04 → email → S-06

```mermaid
graph TD
    A[O-02 Modal de login] --> B[O-04 Forgot password]
    B --> C[Ingresa email]
    C --> D[Email con link + token]
    D --> E[S-06 /reset-password?token=...]
    E --> F{¿Token válido?}
    F -->|no / ausente| G[Invalid or missing reset token<br/>SIN SALIDA]
    F -->|sí| H[Dos campos de contraseña]
    H --> I{¿Coinciden y ≥8 chars?}
    I -->|no| J[Error inline]
    I -->|sí| K[🔭 Password Updated<br/>+ Go to home]

    style G fill:#ef4444,color:#fff
    style K fill:#22c55e,color:#fff
```

**Por qué este flujo es crítico y no obvio:** el registro a un evento **crea el usuario sin
contraseña** (`password_hash` nulo). Para esas personas —que entraron por un link compartible— este
flujo **no es "recuperar" una contraseña: es la única forma de obtener una**. Y la interfaz no lo
explica en ningún lado.

### Caminos no felices

| Situación | Qué ve el usuario | Estado |
|---|---|---|
| Token ausente o inválido | `Invalid or missing reset token.` | ⚠️ **Sin salida**: la tarjeta no ofrece ningún botón ni link |
| Token expirado (>1h) | `Something went wrong. The link may have expired.` | Aceptable, pero sin acción para volver a pedirlo |
| Contraseñas no coinciden | `Passwords do not match.` | Bien resuelto |
| Menos de 8 caracteres | `Password must be at least 8 characters.` | Bien resuelto |

⚠️ **El estado de token inválido es un callejón sin salida.** El usuario queda en una pantalla con
un mensaje de error y **ninguna forma de pedir un link nuevo** ni de volver al inicio.

---

## Flujos deliberadamente no documentados

Por la Regla 7 (no rellenar), estos existen pero no son críticos:

- **Explorar el listado y filtrar por tabs** — Navegación, sin decisión relevante.
- **Login con Google** — Variante de autenticación de UF-04.
- **Ver resultados** — Es una pantalla terminal de lectura, sin ramificación. Su problema no es de
  flujo sino de definición: no está decidido cuál ranking es el oficial.
- **Compartir el evento** — Una acción de un click. Su defecto (puede fallar en silencio) está en
  el reporte de gaps.
