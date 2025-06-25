@echo off
REM Debug API errors

echo =========================================
echo Debugging API Errors
echo =========================================
echo.

echo 1. Checking API error logs...
docker-compose logs --tail=50 wadm-api | findstr /i "error traceback exception"
echo.

echo 2. Testing if API can reach MCP server...
docker exec wadm-api ping -c 2 mcp-server
echo.

echo 3. Checking API environment variables...
docker exec wadm-api env | findstr "MCP_SERVER API_MASTER"
echo.

echo 4. Testing internal API call to MCP...
docker exec wadm-api python -c "import httpx; print(httpx.get('http://mcp-server:3000/health').json())"
echo.

echo 5. Looking for import errors...
docker exec wadm-api python -c "from src.api.services.mcp import MCPClient; print('MCPClient imported OK')"
echo.

pause
