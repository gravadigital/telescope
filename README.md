# Telescope

Monorepo de Telescope: la api, el front y todo lo necesario para levantarlo.

```
telescope/
├── api/       API en Go
├── web/       Front en React
├── deploy/    Composes y variables para levantar el stack
└── docs/      Documentación de producto y arquitectura (Grava Workflow)
```

## Estado

Repositorio recién creado a partir de los tres repos anteriores
(`telescopio-api`, `Telescopio-web`, `Telescopio-deploy`). El código entró tal
cual estaba en `dev`; **todavía no está la documentación de producto, el CI ni
el deploy reescrito**. Eso es lo que sigue.

## Levantar el proyecto

Pendiente. La idea es que sea un solo comando desde `deploy/`, como en jiku.
Por ahora valen las instrucciones de cada servicio:

- [api/README.md](api/README.md)
- [web/README.md](web/README.md)

## Documentación

La metodología es [Grava Workflow](https://github.com/gravadigital/grava-workflow)
en modo monorepo: la documentación de producto vive en `docs/` en la raíz y cada
servicio declara su arquitectura en `docs/architectures/{servicio}/`.

Empezar por `/status` para ver en qué estado está el producto.
