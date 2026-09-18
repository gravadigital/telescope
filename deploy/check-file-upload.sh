#!/bin/bash

# Script para verificar un archivo específico en MinIO
# Uso: ./check-file-upload.sh <nombre_archivo>

if [ -z "$1" ]; then
    echo "Uso: $0 <nombre_archivo>"
    echo "Ejemplo: $0 abc123_xyz789_1234567890.jpg"
    exit 1
fi

FILENAME=$1
ENVIRONMENT="${ENVIRONMENT:-dev}"

echo "=== Buscando archivo: $FILENAME ==="
echo ""

# Buscar el archivo en MinIO
echo "🔍 Buscando en bucket..."
RESULT=$(docker compose exec telescope-${ENVIRONMENT}-minio mc find /data/telescopio -name "*${FILENAME}*" 2>/dev/null)

if [ -z "$RESULT" ]; then
    echo "❌ Archivo no encontrado en MinIO"
    echo ""
    echo "💡 Últimos archivos en el bucket:"
    docker compose exec telescope-${ENVIRONMENT}-minio mc ls --recursive /data/telescopio 2>/dev/null | tail -10
else
    echo "✅ Archivo encontrado:"
    echo "$RESULT"
    echo ""
    
    # Mostrar información del archivo
    echo "📊 Información del archivo:"
    docker compose exec telescope-${ENVIRONMENT}-minio mc stat /data/telescopio/${FILENAME} 2>/dev/null || \
    docker compose exec telescope-${ENVIRONMENT}-minio mc ls -l /data/telescopio/${FILENAME} 2>/dev/null
fi

echo ""
echo "=== Verificación en base de datos ==="
# Buscar en la base de datos
docker compose exec telescope-${ENVIRONMENT}-database psql -U ${POSTGRES_USER:-devuser} -d ${POSTGRES_DB:-telescope-db} -c "SELECT id, original_name, file_path, file_size, mime_type, uploaded_at FROM attachments WHERE file_path LIKE '%${FILENAME}%' ORDER BY uploaded_at DESC LIMIT 5;" 2>/dev/null || echo "No se pudo consultar la base de datos"

echo ""
