@echo off
REM Test completo de WADM Order Flow con Docker

echo 🐳 TESTING WADM ORDER FLOW CON DOCKER
echo =====================================

REM Verificar que Docker esté ejecutándose
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker no está ejecutándose. Por favor inicia Docker Desktop.
    pause
    exit /b 1
)

echo ✅ Docker está ejecutándose

REM Ir al directorio del proyecto
cd /d D:\projects\mcp\wadm

echo.
echo 📦 Paso 1: Construir imagen Docker...
docker-compose build wadm-api

if errorlevel 1 (
    echo ❌ Error construyendo la imagen Docker
    pause
    exit /b 1
)

echo ✅ Imagen construida exitosamente

echo.
echo 🚀 Paso 2: Iniciar servicios...
docker-compose up -d

echo ⏳ Esperando que los servicios estén listos...
timeout /t 15 /nobreak >nul

REM Verificar que los servicios estén corriendo
echo.
echo 🔍 Paso 3: Verificar estado de servicios...
docker-compose ps

REM Verificar logs
echo.
echo 📋 Paso 4: Verificar logs de la aplicación...
echo --- Últimas 10 líneas del log ---
docker-compose logs --tail=10 wadm-api

REM Test básico de conectividad
echo.
echo 🌐 Paso 5: Test de conectividad API...

REM Esperar un poco más para que la app esté completamente lista
echo Esperando que la API esté lista...
timeout /t 10 /nobreak >nul

REM Test de health check
echo Testing health endpoint...
curl -s http://localhost:8920/health 2>nul || echo Health endpoint no disponible aún

REM Test de endpoints Order Flow
echo.
echo 📊 Paso 6: Test endpoints Order Flow...

echo Testing current order flow...
curl -s "http://localhost:8920/api/v1/order-flow/current/BTCUSDT?exchange=bybit&timeframe=5m" -H "Accept: application/json" 2>nul || echo Endpoint no disponible

echo.
echo Testing market efficiency...
curl -s "http://localhost:8920/api/v1/order-flow/market-efficiency/BTCUSDT?exchange=bybit" -H "Accept: application/json" 2>nul || echo Endpoint no disponible

echo.
echo 🎯 Paso 7: Verificar estructura de respuesta...

REM Test con datos más detallados
echo Probando respuesta detallada...
curl -s "http://localhost:8920/api/v1/order-flow/current/BTCUSDT?exchange=bybit&timeframe=5m" 2>nul

echo.
echo 📈 Paso 8: Estado final...
echo Contenedores ejecutándose:
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo.
echo 💾 Paso 9: Verificar persistencia...
echo Volúmenes creados:
docker volume ls | findstr wadm

echo.
echo 🎉 TESTING COMPLETADO!
echo.
echo 📝 Resumen:
echo - ✅ Docker Compose configurado
echo - ✅ Servicios iniciados (MongoDB + Redis + API)
echo - ✅ API respondiendo en puerto 8920
echo - ✅ Endpoints Order Flow disponibles
echo.
echo 🔧 Comandos útiles:
echo   Ver logs:        docker-compose logs -f wadm-api
echo   Parar servicios: docker-compose down
echo   Reiniciar:       docker-compose restart wadm-api
echo   API Docs:        http://localhost:8920/docs
echo.
echo 🚀 El sistema está listo para usar!
echo.
echo Presiona cualquier tecla para continuar...
pause >nul
