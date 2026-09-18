# Telescopio Web

Una aplicación web para gestionar eventos construida con React y TypeScript.

## Tecnologías

- **React 19** - Framework frontend
- **TypeScript** - Lenguaje de programación
- **CSS3** - Estilos personalizados
- **Web Vitals** - Métricas de rendimiento

## Levantar con Docker

Este repositorio levanta **sólo la web**. La API se levanta aparte, desde el repositorio
[`telescopio-api`](https://github.com/gravadigital/telescopio-api) — conviene arrancar esa primero.

### Requisitos

- Docker Engine 24+ con Compose v2 (`docker compose version`)

No hace falta tener Node instalado: el bundle se compila dentro del contenedor.

### Pasos

```bash
# 1. Copiar la plantilla de variables de entorno
cp .env.example .env

# 2. Revisar que REACT_APP_API_URL apunte a la API que está corriendo
#    (por defecto http://localhost:8080)

# 3. Construir y levantar
docker compose up -d --build
```

Abrir [http://localhost:3000](http://localhost:3000).

### Comandos frecuentes

```bash
docker compose ps               # estado del contenedor
docker compose logs -f web      # logs de nginx
docker compose up -d --build    # reconstruir (obligatorio al cambiar variables REACT_APP_*)
docker compose down             # bajar
```

---

## Variables de entorno

Se configuran en el `.env` (plantilla en `.env.example`). `.env` está en `.gitignore`.

| Variable | Descripción |
|---|---|
| `WEB_PORT` | Puerto en el que se publica la web. Default `3000`. |
| `REACT_APP_API_URL` | URL de la API **tal como la ve el navegador**. Default `http://localhost:8080`. |
| `REACT_APP_GOOGLE_CLIENT_ID` | Login con Google (opcional). Vacío = sólo email + contraseña. Tiene que ser el mismo client id que usa la API. |

### ⚠️ Las variables `REACT_APP_*` son de build-time

Create React App las incrusta en el bundle **cuando se compila**, no cuando arranca el
contenedor. Cambiarlas en el `.env` y reiniciar **no alcanza**: hay que reconstruir.

```bash
docker compose up -d --build
```

### Apuntar a la API

`REACT_APP_API_URL` tiene que ser una URL que el **navegador** pueda resolver:

- API en la misma máquina: `http://localhost:8080`
- API en otro puerto: `http://localhost:8081` (el `API_PORT` que se haya configurado allá)
- API en otra máquina: `http://<ip-o-dominio>:8080`

Nunca usar el nombre interno del contenedor (`http://api:8080`): los dos stacks son
independientes y quien hace los pedidos es el navegador, no el contenedor de la web.

---

## Problemas comunes

**La web carga pero no trae datos** — casi siempre `REACT_APP_API_URL` está mal o la API
no está corriendo. Verificar con `curl http://localhost:8080/health`, y que la URL del
`.env` sea la misma. Si la corregís, reconstruir con `--build`.

**Error de CORS en la consola del navegador** — en el `.env` de la API, `CORS_ALLOW_ORIGINS`
tiene que incluir la URL de la web (o ser `*`).

**Cambié una variable y no pasa nada** — falta el rebuild: `docker compose up -d --build`.

**`port is already allocated`** — otro proceso usa el 3000. Cambiar `WEB_PORT` en el `.env`.

---

## Desarrollo sin Docker

### Requisitos

- Node.js >= 16
- npm >= 8

### Instalación

Instalar las dependencias:

```bash
npm install
```

### Servidor de desarrollo

Crear un `.env` con `REACT_APP_API_URL=http://localhost:8080` y:

```bash
npm start
```
Esto abrirá la app en [http://localhost:3000](http://localhost:3000).

### Build de producción

```bash
npm run build
```
Genera la versión optimizada en la carpeta `build/`.

### Actualizar paquetes

```bash
# Ver actualizaciones disponibles
npm outdated

# Actualizar un paquete específico
npm update nombre-paquete
```

### Scripts disponibles

- `npm start` — Inicia el servidor de desarrollo
- `npm run build` — Crea una build optimizada para producción
- `npm test` — Ejecutar tests

## 📚 Documentación

- **[TESTING.md](./TESTING.md)** - Guía para probar la aplicación

## 🎯 Funcionalidades

- Sistema de autenticación (login/registro)
- Gestión de eventos y participación
- Subida de archivos para eventos
- Estados de evento (registro, subida, votación, resultados)
- Diseño responsive

