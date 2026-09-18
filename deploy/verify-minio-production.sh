#!/bin/bash

# Script para verificar archivos en MinIO en producción
# Uso: ./verify-minio-production.sh

ENVIRONMENT="${ENVIRONMENT:-dev}"

echo "=== Verificación MinIO en Producción ==="
echo "Ambiente: $ENVIRONMENT"
echo ""

# 1. Estado del servicio MinIO
echo "📦 Estado del servicio MinIO:"
docker compose ps telescope-${ENVIRONMENT}-minio
echo ""

# 2. Health check de MinIO
echo "🏥 Health check MinIO:"
docker compose exec telescope-${ENVIRONMENT}-minio curl -sf http://localhost:9000/minio/health/live && echo "✅ MinIO está saludable" || echo "❌ MinIO no responde"
echo ""

# 3. Listar archivos en el bucket
echo "📁 Archivos en el bucket 'telescopio':"
docker compose exec telescope-${ENVIRONMENT}-minio mc ls /data/telescopio/ 2>/dev/null | tail -20
echo ""

# 4. Contar archivos
FILE_COUNT=$(docker compose exec telescope-${ENVIRONMENT}-minio mc ls /data/telescopio/ 2>/dev/null | wc -l)
echo "📊 Total de archivos: $FILE_COUNT"
echo ""

# 5. Espacio usado
echo "💾 Espacio usado en el bucket:"
docker compose exec telescope-${ENVIRONMENT}-minio mc du /data/telescopio 2>/dev/null || echo "No se pudo obtener información de espacio"
echo ""

# 6. Últimos 5 archivos subidos
echo "🕐 Últimos 5 archivos subidos:"
docker compose exec telescope-${ENVIRONMENT}-minio mc ls --recursive /data/telescopio 2>/dev/null | sort -k1,2 | tail -5
echo ""

# 7. Logs recientes de MinIO
echo "📋 Logs recientes de MinIO (últimas 10 líneas):"
docker compose logs --tail=10 telescope-${ENVIRONMENT}-minio
echo ""

# 8. Verificar conectividad desde la API
echo "🔗 Verificar conectividad API → MinIO:"
docker compose exec telescope-${ENVIRONMENT}-api wget -q -O- http://telescope-${ENVIRONMENT}-minio:9000/minio/health/live && echo "✅ API puede conectar a MinIO" || echo "❌ API no puede conectar a MinIO"
echo ""

echo "=== Verificación completada ==="
echo ""
echo "💡 Para acceder a la consola web de MinIO:"
echo "   URL: https://minio.${DOMAIN:-tu-dominio.com}"
echo "   Usuario: Ver variable MINIO_ROOT_USER en .env"
echo "   Password: Ver variable MINIO_ROOT_PASSWORD en .env"
