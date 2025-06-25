@echo off
REM Quick Docker restart and test for import fixes

echo 🔧 TESTING IMPORT FIXES WITH DOCKER
echo ================================================

echo 1. Stopping any running containers...
docker-compose down

echo 2. Starting containers...
docker-compose up -d

echo 3. Waiting for services to start...
timeout /t 10 /nobreak

echo 4. Checking container status...
docker-compose ps

echo 5. Checking API logs for import errors...
docker-compose logs wadm-api --tail=20

echo 6. Testing API endpoint...
curl -H "X-API-Key: wadm_dev_master_key_2025" http://localhost:8000/api/v1/indicators/status

echo.
echo 🎯 If no import errors above, Phase 1 is working!
pause
