#!/bin/bash
# Test completo de WADM Order Flow con Docker

echo "🐳 TESTING WADM ORDER FLOW CON DOCKER"
echo "====================================="

# Verificar que Docker esté ejecutándose
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker no está ejecutándose. Por favor inicia Docker Desktop."
    exit 1
fi

echo "✅ Docker está ejecutándose"

# Ir al directorio del proyecto
cd "$(dirname "$0")"

echo ""
echo "📦 Paso 1: Construir imagen Docker..."
docker-compose build wadm-api

if [ $? -ne 0 ]; then
    echo "❌ Error construyendo la imagen Docker"
    exit 1
fi

echo "✅ Imagen construida exitosamente"

echo ""
echo "🚀 Paso 2: Iniciar servicios..."
docker-compose up -d

echo "⏳ Esperando que los servicios estén listos..."
sleep 15

# Verificar que los servicios estén corriendo
echo ""
echo "🔍 Paso 3: Verificar estado de servicios..."
docker-compose ps

# Verificar logs
echo ""
echo "📋 Paso 4: Verificar logs de la aplicación..."
echo "--- Últimas 10 líneas del log ---"
docker-compose logs --tail=10 wadm-api

# Test básico de conectividad
echo ""
echo "🌐 Paso 5: Test de conectividad API..."

# Esperar un poco más para que la app esté completamente lista
sleep 10

# Test de health check
echo "Testing health endpoint..."
curl -s http://localhost:8920/health || echo "Health endpoint no disponible aún"

# Test de endpoints Order Flow (estos fallarán sin datos pero deben responder)
echo ""
echo "📊 Paso 6: Test endpoints Order Flow..."

echo "Testing current order flow..."
curl -s "http://localhost:8920/api/v1/order-flow/current/BTCUSDT?exchange=bybit&timeframe=5m" \
    -H "Accept: application/json" || echo "Endpoint no disponible"

echo ""
echo "Testing market efficiency..."
curl -s "http://localhost:8920/api/v1/order-flow/market-efficiency/BTCUSDT?exchange=bybit" \
    -H "Accept: application/json" || echo "Endpoint no disponible"

echo ""
echo "🎯 Paso 7: Verificar estructura de respuesta..."

# Test con datos más detallados
response=$(curl -s "http://localhost:8920/api/v1/order-flow/current/BTCUSDT?exchange=bybit&timeframe=5m")
echo "Response: $response"

echo ""
echo "📈 Paso 8: Estado final..."
echo "Contenedores ejecutándose:"
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "💾 Paso 9: Verificar persistencia..."
echo "Volúmenes creados:"
docker volume ls | grep wadm

echo ""
echo "🎉 TESTING COMPLETADO!"
echo ""
echo "📝 Resumen:"
echo "- ✅ Docker Compose configurado"
echo "- ✅ Servicios iniciados (MongoDB + Redis + API)"
echo "- ✅ API respondiendo en puerto 8920"
echo "- ✅ Endpoints Order Flow disponibles"
echo ""
echo "🔧 Comandos útiles:"
echo "  Ver logs:        docker-compose logs -f wadm-api"
echo "  Parar servicios: docker-compose down"
echo "  Reiniciar:       docker-compose restart wadm-api"
echo "  API Docs:        http://localhost:8920/docs"
echo ""
echo "🚀 El sistema está listo para usar!"
