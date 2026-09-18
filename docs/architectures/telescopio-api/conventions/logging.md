---
id: logging
display_name: Logging (charmbracelet/log)
language: golang
description: Leveled key-value logging with per-component child loggers
applies_to: [api]
required_by: []
package: github.com/charmbracelet/log
---

# Logging (telescopio-api)

> **Reemplaza la convención del catálogo**, que usa zerolog con salida JSON. Este servicio
> usa `charmbracelet/log`, pensado para salida legible en consola.

## Configuración

Se inicializa una vez en `main.go`. El nivel se deriva de `GIN_MODE`: `debug` → `debug`,
cualquier otro → `info`.

```go
logger.Initialize(logLevel)
log := logger.Get()
```

Escribe a **stderr**, con timestamp y caller.

## Uso

Siempre pares clave-valor, nunca interpolación en el mensaje:

```go
h.log.Error("failed to create event", "error", err, "event_id", eventID)
```

Loggers por componente, obtenidos en el constructor:

```go
logger.Service("event-handler")   // service=event-handler
logger.Database()                 // component=database
logger.Migration()                // component=migration
```

## Niveles

| Nivel | Cuándo |
|---|---|
| `Debug` | Detalle de desarrollo. Solo visible con `GIN_MODE=debug` |
| `Info` | Hitos: arranque, conexión establecida, migraciones aplicadas |
| `Warn` | Situación recuperable o configuración sospechosa |
| `Error` | Operación que falló |
| `Fatal` | Solo en `main.go`, para fallas de arranque. Termina el proceso |

## Qué no loguear

- Passwords, hashes, tokens JWT, tokens de reset, credenciales SMTP o de MinIO.
- **Cuidado con la connection string.** `main.go:225` loguea `cfg.GetDatabaseURL()` en
  `Debug`, que incluye la password de la base. Solo aparece con `GIN_MODE=debug`, pero no
  agregues más usos de eso.

## Requests

El middleware `events.CreateEvent()` ya loguea cada request con `request_id`, método, path,
status y latencia. No dupliques ese logging en los handlers.

## Limitación conocida

La salida no es JSON estructurado, así que no es directamente ingestable por un colector de
logs sin parseo. El `request_id` existe pero no se propaga a los loggers de los handlers:
un error logueado en un handler no se puede correlacionar con la línea del request. Si se
agrega observabilidad, esto es lo primero a resolver.
