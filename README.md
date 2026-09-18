# Telescope

Monorepo de Telescope: la api, el front y todo lo necesario para levantarlo.

```
telescope/
├── api/       API en Go
├── web/       Front en React
├── deploy/    Composes y variables para levantar el stack
└── docs/      Documentación de producto y arquitectura (Grava Workflow)
```

## Levantar el proyecto

```sh
cd deploy
cp .env.dist .env     # completar JWT_SECRET: openssl rand -base64 32
./local.sh up
```

Eso levanta la base, MinIO con su bucket, la api y la web:

| | |
|---|---|
| web | http://localhost:3000 |
| api | http://localhost:8080 |

El detalle, y cómo se despliega en un servidor, en [deploy/README.md](deploy/README.md).

## Documentación

La metodología es [Grava Workflow](https://github.com/gravadigital/grava-workflow)
en modo monorepo: la documentación de producto vive en `docs/` en la raíz y cada
servicio declara su arquitectura en `docs/architectures/{servicio}/`.

Empezar por `/status` para ver en qué estado está el producto.
