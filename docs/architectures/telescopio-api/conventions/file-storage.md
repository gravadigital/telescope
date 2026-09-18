---
id: file-storage
display_name: Almacenamiento de archivos (local / MinIO)
language: golang
description: Pluggable object storage behind a FileStorage interface, backed by the local filesystem or MinIO
applies_to: [api]
required_by: []
package: github.com/minio/minio-go/v7
---

# File Storage (telescopio-api)

**No existe en el catálogo.** Es una preocupación propia de este servicio: las propuestas
que suben los participantes se guardan como archivos, y el backend de almacenamiento se
elige por configuración.

## La interfaz

`internal/storage/file_storage.go` define el puerto. Todo lo que toque archivos depende de
esta interfaz, nunca de una implementación concreta:

```go
type FileStorage interface {
    Put(ctx context.Context, key string, reader io.Reader, size int64, contentType string) (string, error)
    Get(ctx context.Context, key string) (io.ReadCloser, error)
    Delete(ctx context.Context, key string) error
    GetURL(ctx context.Context, key string) (string, error)
    Exists(ctx context.Context, key string) (bool, error)
    GetInfo(ctx context.Context, key string) (*FileInfo, error)
}
```

Es de las pocas partes del servicio que sí recibe `context.Context`. Mantenelo.

## Implementaciones

| Provider | Tipo | Cuándo |
|---|---|---|
| `local` | `LocalStorage` — filesystem bajo `STORAGE_LOCAL_PATH` | Desarrollo |
| `minio` | `MinIOStorage` — S3-compatible | Producción |

Se construye en `main.go` con `storage.NewFileStorage(cfg)`, que despacha según
`STORAGE_PROVIDER` y falla si el valor no es ninguno de los dos. MinIO exige credenciales
y crea el bucket si no existe.

## Claves

La clave se arma en el handler de upload, no en el storage:

```go
ext := filepath.Ext(filepath.Base(header.Filename))
secureFilename := fmt.Sprintf("%s_%s_%d%s", eventID, participantID, time.Now().Unix(), ext)
storageKey, err := h.fileStorage.Put(ctx, secureFilename, file, header.Size, contentType)
```

El nombre original **nunca** se usa como clave: se guarda aparte en
`attachments.original_name` y se devuelve en el `Content-Disposition` de la descarga. La
clave que devuelve `Put` se persiste en `attachments.file_path`.

## Seguridad al agregar código

1. **Path traversal.** `LocalStorage.Put` rechaza claves donde `filepath.Clean(key) != key`,
   y el handler normaliza con `filepath.Base` antes de componer. Si construís una clave
   desde entrada del usuario, sanitizala igual.
2. **Tipos permitidos.** El upload valida el Content-Type contra una lista blanca (JPEG,
   PNG, GIF, PDF, TXT, DOC, DOCX). Ampliarla es una decisión de producto, no un detalle.
3. **Tamaño.** Limitado por `MAX_FILE_SIZE` (10MB por defecto) y además por un CHECK en la
   base (≤100MB).
4. **Compensación ante fallo.** Si el archivo se guardó pero el `INSERT` falla, el handler
   borra el archivo (`attachment_handler.go:268`). Mantené ese patrón: no hay transacción
   que abarque storage y base.

## Limitaciones conocidas

- **`GetURL` de MinIO devuelve una URL prefirmada**, pero la descarga no la usa: sirve el
  archivo por streaming a través de la API. Eso hace pasar todo el tráfico de archivos por
  el backend en vez de delegarlo al object storage.
- **Si `io.Copy` falla a mitad del stream de descarga**, el `200` ya se envió: la respuesta
  queda truncada y solo se loguea el error (`attachment_handler.go`).
- **La descarga no tiene autenticación** — ver la deuda técnica en el overview. Es un
  problema de la ruta, no de esta convención, pero se manifiesta acá.
