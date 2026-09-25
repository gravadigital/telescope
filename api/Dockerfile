# Build stage
# Versión exacta, igual a la directiva `go` de go.mod. La imagen oficial trae
# GOTOOLCHAIN=local: si su Go es más viejo que el que pide go.mod, `go mod download`
# aborta. Con el tag móvil (1.26-alpine) eso dependía de qué copia hubiera en la caché
# de cada máquina. Al subir la versión en go.mod, subila también acá.
FROM golang:1.26.6-alpine AS builder

# Install git and ca-certificates (needed for downloading dependencies)
RUN apk update && apk add --no-cache git ca-certificates tzdata && update-ca-certificates

# Create appuser for security
RUN adduser -D -g '' appuser

# La versión la fija scripts/set-version.sh y la pasa el CI. Se compila dentro del
# binario con -ldflags: en Go no hay un package.json donde declararla, y un version.go
# sería código que existe sólo para llevar un número.
ARG VERSION=dev

# Set working directory
WORKDIR /build

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo \
    -ldflags "-extldflags '-static' -X main.version=${VERSION}" \
    -o main ./cmd/api

# Final stage
FROM scratch

# Import from builder
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /etc/passwd /etc/passwd

# Copy the binary
COPY --from=builder /build/main /app/main

# Use an unprivileged user
USER appuser

# Expose port
EXPOSE 8080

# Set working directory
WORKDIR /app

# Run the binary
ENTRYPOINT ["./main"]
