---
id: auth-jwt
display_name: Autenticación JWT (golang-jwt) y permisos compuestos
language: golang
description: JWT HS256 issuance and verification, dual role model, permission middlewares
applies_to: [api]
required_by: []
package: github.com/golang-jwt/jwt/v5
---

# Auth (api)

Mismo paquete que el catálogo (`golang-jwt/v5`), pero el servicio **emite** tokens además
de verificarlos, tiene un modelo de roles en dos niveles y compone la autorización con
middlewares por ruta. Se documenta como custom por eso.

## Token

- HS256, secreto desde `JWT_SECRET`.
- Vigencia: **24 horas**. No hay refresh token.
- Claims: `user_id`, `email`, `role`, más `ExpiresAt`, `IssuedAt`, `NotBefore`,
  `Issuer: "api"`.

```go
token, err := auth.GenerateToken(user.ID, user.Email, user.Role)
```

> **Riesgo conocido:** si `JWT_SECRET` no está seteado, el servicio arranca igual con el
> valor por defecto `"telescopio-dev-secret-change-in-production"` y solo imprime un
> warning (`jwt.go:20-26`). En producción eso permite firmar tokens válidos a cualquiera
> que conozca el default. Debería abortar el arranque.

## Verificación

`auth.JWTAuthMiddleware()` espera `Authorization: Bearer <token>`, valida el método de
firma y deja en el contexto `user_id`, `user_email` y `user_role`. Se leen con los helpers:

```go
userID, err := auth.GetUserIDFromContext(c)
role, err := auth.GetUserRoleFromContext(c)
```

## Modelo de roles en dos niveles

Esto es específico del producto y hay que tenerlo claro:

| Nivel | Dónde | Valores | Para qué |
|---|---|---|---|
| **Global** | `users.role`, va en el JWT | `admin`, `organizer`, `participant` | Capacidades del sistema |
| **Por evento** | `event_participants.role` | `creator`, `participant` | Quién manda en *este* evento |

Un usuario puede ser `creator` de un evento y `participant` de otro. La autoría del evento
se verifica contra `events.author_id`, no contra el rol global.

`admin` saltea todas las verificaciones de permisos.

## Middlewares de permisos

Se declaran en la ruta, después de `JWTAuthMiddleware`:

```go
events.PATCH("/:event_id/stage",
    auth.RequireEventOwner(eventRepo),
    eventHandler.UpdateEventStage)
```

| Middleware | Permite |
|---|---|
| `RequireRole(roles...)` | Los roles globales indicados |
| `RequireEventOwner(repo)` | Autor del evento, o `admin` |
| `RequireEventOwnerOrOrganizer(repo)` | Lo anterior, más cualquier `organizer` |
| `RequireParticipantOrOwner(repo)` | El propio participante, el autor del evento, o `admin` |

Estos middlewares responden con la **forma B** de error (`{"error": "CODE", "message": "..."}`),
distinta de la de los handlers. Ver la convención `error-handling`.

## Passwords

- bcrypt con `DefaultCost`, mínimo 8 caracteres (`participant.User.SetPassword`).
- `password_hash` es **nullable**: los usuarios creados por Google OAuth o por registro a
  un evento no tienen password. `CheckPassword` devuelve `false` si es nulo.
- Reset: token aleatorio de 32 bytes en hex, expiración de 1 hora, de un solo uso
  (`ClearPasswordResetToken` tras usarlo).
- `forgot-password` responde `200` aunque el email no exista, para no permitir enumeración
  de usuarios. **Mantené ese comportamiento.**

## Google OAuth

`internal/handlers/google_auth_service.go` verifica el access token contra Google y
resuelve el perfil. El flujo tiene dos pasos: `verify` informa si el usuario ya existe
(`status: "existing_user"` con JWT, o `status: "new_user"` con el perfil sugerido) y
`register` crea la cuenta. Un usuario Google se vincula por `google_id` (único).

## Reglas al agregar endpoints

1. **Verificá en qué grupo registrás la ruta.** Fuera del grupo con
   `JWTAuthMiddleware()` el endpoint queda público. Así quedó expuesto
   `/attachments/:attachment_id/download`.
2. **Autenticado no es autorizado.** Si el recurso pertenece a alguien, sumá el middleware
   de permiso. Hoy `GET /users/:user_id` no verifica ownership y cualquier autenticado lee
   cualquier usuario.
3. **La verificación de permisos va en el middleware, no en el handler**, salvo que dependa
   del body.
