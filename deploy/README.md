# Deploy

Cómo levantar Telescope: en una máquina de desarrollo y en un servidor.

```
deploy/
├── local.sh                  levanta todo el stack en esta máquina
├── .env.dist                 plantilla de variables — copiar a .env
├── docker-compose.local.yml  desarrollo: construye desde el repo
└── docker-compose.yml        producción: baja las imágenes del registry
```

**Todo lo necesario para levantar el stack vive acá.** Los secretos van en `deploy/.env`,
que no se versiona.

---

## En esta máquina

Dos pasos, y el primero es una sola vez:

```sh
cd deploy
cp .env.dist .env
```

Completar **`JWT_SECRET`** en `.env` — es lo único obligatorio. Generarlo con:

```sh
openssl rand -base64 32
```

Todo lo demás ya viene apuntado al stack local. Después:

```sh
./local.sh up
```

Eso levanta la base, espera a que responda, levanta MinIO, **le crea el bucket**,
construye la api y la web, y las deja andando:

| | |
|---|---|
| web | http://localhost:3000 |
| api | http://localhost:8080 |
| consola de MinIO | http://localhost:9001 |

Los otros comandos:

```sh
./local.sh logs        # seguir los logs de todo
./local.sh logs api    # sólo los de un servicio
./local.sh stop        # frenar todo, conservando la base y los archivos
./local.sh down        # bajar todo y borrar los datos
```

**Para cortar el día usá `stop`, no `down`.** `down` borra los volúmenes: se pierden los
usuarios, eventos y propuestas que hayas cargado, y la base vuelve a arrancar vacía. Después
de un `stop`, `./local.sh up` levanta todo con los datos como estaban: las migraciones ya
aplicadas no se repiten y el bucket existente se respeta.

### Detalles que conviene saber

**La base arranca vacía y está bien.** Las migraciones las corre la api al arrancar, así
que no hace falta ningún dump.

**El bucket de MinIO lo crea `local.sh`, no la api.** La api firma contra un bucket que da
por existente, así que sin ese paso la primera subida de un archivo falla con
`NoSuchBucket`. Es el error más fácil de provocar y el más difícil de diagnosticar, porque
el mensaje no apunta a la causa.

**La web congela su configuración al construirse.** Create React App reemplaza las
`REACT_APP_*` en el momento del build, no al arrancar, así que entran como `--build-arg` y
no como variables de entorno. Por eso `./local.sh up` construye siempre con `--build`: una
imagen vieja seguiría apuntando a la URL anterior sin ningún aviso.

**pgAdmin es opcional.** Está bajo el profile `tools`:

```sh
docker compose -f docker-compose.local.yml --profile tools up -d pgadmin
```

---

## En un servidor

`docker-compose.yml` no construye nada: baja las imágenes publicadas en Docker Hub
(`gravadigital/telescope-api` y `gravadigital/telescope-web`) y se cuelga de un nginx que
ya existe en el servidor, por `INGRESS_NETWORK`.

Qué versión levanta lo deciden estas dos variables de `.env`:

```
API_VERSION=1.2.3
WEB_VERSION=1.2.3
```

Son dos para poder redesplegar un servicio sin tocar el otro, pero **el número es siempre
el mismo**: el monorepo tiene una sola versión. Ver la política en
[CHANGELOG.md](../CHANGELOG.md).

Para seguir la punta de `dev` en un entorno de staging:

```
API_VERSION=dev
WEB_VERSION=dev
```

Ese tag se mueve con cada push a la rama. Si necesitás volver a una imagen dev puntual,
cada build publica además un `dev-<sha>` que no se mueve nunca.

```sh
docker compose pull && docker compose up -d
```

### Variables que sí o sí hay que completar en un servidor

| Variable | Por qué |
|---|---|
| `JWT_SECRET` | sin esto no funciona ningún login |
| `POSTGRES_PASSWORD` | el default es de desarrollo |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | ídem |
| `DOMAIN` | lo usan el ingress y los links de los mails |
| `GOOGLE_CLIENT_ID` | sólo si se usa login con Google |
| `SMTP_*` | sólo si `EMAIL_ENABLED=true` |
