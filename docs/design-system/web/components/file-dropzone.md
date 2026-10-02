---
component: file-dropzone
version: 2.0.0
status: active
last_updated: 2026-10-02
related: [text-field, callout, button]
---

# FileDropzone

## Propósito

Elegir un archivo arrastrando o desde el equipo, ver los formatos permitidos **antes** de elegir y
confirmar qué se va a enviar. Incluye el **FileChip** (archivo elegido).

**Cuándo usar:** subir y reemplazar la propuesta (S-04, 1f).

**Cuándo NO usar:** múltiples archivos (el dominio permite una propuesta por participante).

## Anatomía

1. **Zona** — `bg.surface.subtle`, borde punteado `border.strong`, `radius.area`.
2. **Ícono** — upload.
3. **Texto** — "Arrastrá tu archivo acá o **elegilo desde tu equipo**".
4. **Formatos y límite** — "JPG, PNG, GIF, WebP, PDF, TXT, DOC, DOCX · hasta 10 MB".
5. **Error** — dentro de la zona.
6. **FileChip** — tipo (badge mono), nombre, tamaño + "listo para enviar", acción "Cambiar".

## Variants

| Variant | Uso |
|---|---|
| empty | Sin archivo: zona visible |
| selected | FileChip reemplaza a la zona |
| submitted | FileChip con "Enviada el {fecha}" y "Reemplazar archivo" |

## Sizes

Zona de 160px de alto (desktop) / 120px (mobile).

## States

| State | Comportamiento |
|---|---|
| default | Zona en reposo |
| drag-over | `border.focus` + `bg.action.subtle` |
| focus | `focus.ring` |
| error | `border.error` + mensaje en la zona ("El archivo supera los 10 MB.") |
| disabled | Evento pausado o fuera de plazo |
| uploading | FileChip con indicador; "Cambiar" deshabilitado |

## Spacing & sizing rules

Contenido centrado, gap `space.sm` · FileChip con padding `space.md` y `radius.field`.

## Accesibilidad

- La zona es un `<label>` del `<input type="file">` (resuelve el input sin label de la v1.0); activable con Enter/Espacio.
- `accept` con los tipos permitidos; error en `aria-describedby` y anunciado con `role="alert"`.
- "Cambiar" con nombre accesible ("Cambiar archivo {nombre}").

## Guidelines de contenido

Formatos y límite visibles siempre · mensajes de rechazo que dicen el motivo · "10 MB" con espacio (resuelve la inconsistencia "10MB" / "10 MB").

## Do's & don'ts

**Do:** validar tipo y tamaño con `src/domain/files` (misma regla que el backend) · conservar el archivo elegido ante un error de envío.

**Don't:** abrir un modal de confirmación (la confirmación es el FileChip) · aceptar arrastrar varios archivos.

## API

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| accept | string[] | dominio | Tipos MIME |
| maxBytes | number | 10 MB | Límite |
| file | File \| null | — | Elegido |
| submitted | `{name, size, date}` | — | Ya enviado |
| error | string | — | Error |
| disabled | boolean | false | Deshabilitado |
| onSelect / onClear | function | — | Eventos |

## Componentes y patterns relacionados

[callout](./callout.md) · [button](./button.md) · [text-field](./text-field.md) (comentario)

## Historial

- 2026-10-02 v2.0.0 — Creado para REQ-003 (1f). Incluye FileChip.
