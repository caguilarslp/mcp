@echo off
REM Test API key formats

echo =========================================
echo Testing Different API Key Formats
echo =========================================
echo.

echo 1. Test with underscores (from docker-compose)...
curl -v -X GET http://localhost:8000/api/v1/mcp/health ^
  -H "X-API-Key: wadm_dev_master_key_2025" 2>&1 | findstr /i "401 500 200"
echo.

echo 2. Test with hyphens...
curl -v -X GET http://localhost:8000/api/v1/mcp/health ^
  -H "X-API-Key: wadm-dev-master-key-2025" 2>&1 | findstr /i "401 500 200"
echo.

echo 3. Test with different header name...
curl -v -X GET http://localhost:8000/api/v1/mcp/health ^
  -H "x-api-key: wadm_dev_master_key_2025" 2>&1 | findstr /i "401 500 200"
echo.

echo 4. Check what the API expects...
docker exec wadm-api cat /app/src/api/config.py | findstr /i "master_api_key api_key"
echo.

echo 5. Check actual env value...
docker exec wadm-api printenv API_MASTER_KEY
echo.

echo =========================================
echo Checking middleware code...
echo =========================================
docker exec wadm-api grep -n "Invalid API key" /app/src/api/middleware/rate_limit.py
echo.

pause
