# Build stage
# Misma versión mayor que web/.nvmrc, que es la que usa el CI.
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Sin REACT_APP_*: la imagen no lleva configuración de ninguna instalación. La URL de
# la api y el client id de Google se leen al arrancar (40-runtime-config.sh).
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/build /usr/share/nginx/html

# El entrypoint de nginx corre todo /docker-entrypoint.d/*.sh antes de arrancar: este
# escribe config.js con las variables de entorno del contenedor. chmod por si el bit
# de ejecución se perdió en el checkout (Windows).
COPY docker/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

