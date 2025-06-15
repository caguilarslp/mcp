#!/bin/bash
# Debug script to check system state

echo "=== System Health Check ==="
curl -s http://localhost:8000/health | python -m json.tool

echo -e "\n=== Collector Status ==="
curl -s http://localhost:8000/collectors/status | python -m json.tool

echo -e "\n=== Storage Stats ==="
curl -s http://localhost:8000/collectors/storage/stats | python -m json.tool

echo -e "\n=== Recent Trades ==="
curl -s "http://localhost:8000/collectors/trades?limit=5" | python -m json.tool

echo -e "\n=== Debug Storage ==="
curl -s http://localhost:8000/debug/storage | python -m json.tool

echo -e "\n=== Last 50 Container Logs ==="
docker-compose logs --tail=50 app | grep -E "(collector|trade|storage|Bybit|Storage)"
