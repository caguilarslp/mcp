#!/bin/bash
# Quick verification script

echo "=== Rebuilding and restarting containers ==="
docker-compose --profile dev down
docker-compose --profile dev up --build -d

echo "=== Waiting for system to start (30s) ==="
sleep 30

echo "=== Checking collector details ==="
curl -s http://localhost:8000/debug/collector-details 2>/dev/null | python -m json.tool 2>/dev/null || echo "ERROR: Failed to get collector details"

echo -e "\n=== Checking storage stats ==="
curl -s http://localhost:8000/collectors/storage/stats | python -m json.tool

echo -e "\n=== Checking trades ==="
curl -s http://localhost:8000/collectors/trades?limit=3 | python -m json.tool

echo -e "\n=== Last 20 logs with errors or trades ==="
docker-compose logs --tail=100 app | grep -E "(ERROR|trade|Trade|storage|Storage)" | tail -20
