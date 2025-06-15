#!/bin/bash
# Diagnóstico completo del sistema

echo "=== 1. Verificando contenedores ==="
docker-compose ps

echo -e "\n=== 2. Health Check ==="
curl -s http://localhost:8000/health | python -m json.tool

echo -e "\n=== 3. Estado del Collector ==="
curl -s http://localhost:8000/collectors/status/bybit_trades | python -m json.tool

echo -e "\n=== 4. Estadísticas del Storage ==="
curl -s http://localhost:8000/collectors/storage/stats | python -m json.tool

echo -e "\n=== 5. Trades Recientes ==="
curl -s "http://localhost:8000/collectors/trades?limit=5" | python -m json.tool

echo -e "\n=== 6. Debug Tasks ==="
curl -s http://localhost:8000/debug/tasks | python -m json.tool | grep -E '"status"|"task_done"|"websocket"'

echo -e "\n=== 7. Últimos logs del collector ==="
docker-compose logs --tail=50 app | grep -E "trade|Trade|storage|Storage" | tail -20

echo -e "\n=== 8. Verificar si hay errores ==="
docker-compose logs --tail=100 app | grep -i error | tail -10
