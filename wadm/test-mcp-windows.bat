@echo off
REM Test MCP Integration in WADM - Windows Version

echo =========================================
echo Testing MCP Server Integration
echo =========================================
echo.

echo 1. Testing direct MCP wrapper health...
curl -s http://localhost:3000/health
echo.
echo.

echo 2. Testing API health...
curl -s http://localhost:8000/api/v1/system/health
echo.
echo.

echo 3. Testing MCP via API (with full error info)...
curl -v http://localhost:8000/api/v1/mcp/health -H "X-API-Key: wadm_dev_master_key_2025"
echo.
echo.

echo =========================================
echo Checking API logs for errors...
echo =========================================
docker-compose logs --tail=20 wadm-api | findstr /i "error"
echo.

echo =========================================
echo Test Complete - Check output above
echo =========================================
pause
