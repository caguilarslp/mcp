@echo off
REM Test MCP directly without API key issues

echo =========================================
echo Testing MCP Server Direct Connection
echo =========================================
echo.

echo 1. Testing MCP wrapper directly (no API)...
docker exec wadm-api curl -s http://mcp-server:3000/health | python -m json.tool
echo.

echo 2. Testing MCP tools list directly...
docker exec wadm-api curl -s http://mcp-server:3000/mcp/tools -o - | python -c "import sys,json; d=json.load(sys.stdin); print(f'Total tools: {len(d.get(\"tools\",[]))}'); [print(f'{i+1}. {t[\"name\"]}') for i,t in enumerate(d.get('tools',[])[  :5])]"
echo.

echo 3. Testing MCP call directly...
docker exec wadm-api curl -s -X POST http://mcp-server:3000/mcp/call ^
  -H "Content-Type: application/json" ^
  -d "{\"method\": \"tools/list\", \"params\": {}}" ^
  | python -m json.tool
echo.

echo =========================================
echo Testing with Master API Key
echo =========================================
echo.

echo 4. Getting master key from env...
docker exec wadm-api env | findstr API_MASTER_KEY
echo.

echo 5. Testing API with master key...
docker exec wadm-api curl -s http://localhost:8000/api/v1/mcp/health ^
  -H "X-API-Key: wadm_dev_master_key_2025" ^
  | python -m json.tool
echo.

echo =========================================
echo Test Complete!
echo =========================================
pause
