@echo off
REM Test MCP Integration with correct API key

echo =========================================
echo Testing MCP Server Integration
echo =========================================
echo.

set API_KEY=wadm_dev_master_key_2025

echo 1. Testing MCP Health via API...
curl -s http://localhost:8000/api/v1/mcp/health -H "X-API-Key: %API_KEY%" | python -m json.tool
echo.
echo.

echo 2. Listing first 10 MCP Tools...
curl -s http://localhost:8000/api/v1/mcp/tools -H "X-API-Key: %API_KEY%" -o tools.json
python -c "import json; tools=json.load(open('tools.json')); print(f'Total tools: {len(tools)}'); [print(f'{i+1}. {t[\"name\"]} - {t[\"category\"]}') for i,t in enumerate(tools[:10])]"
del tools.json
echo.

echo 3. Testing Market Data (get_ticker)...
curl -s -X POST http://localhost:8000/api/v1/mcp/call ^
  -H "X-API-Key: %API_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"tool\": \"get_ticker\", \"params\": {\"symbol\": \"BTCUSDT\"}}" ^
  | python -m json.tool
echo.

echo 4. Testing Wyckoff Analysis...
curl -s -X POST http://localhost:8000/api/v1/mcp/call ^
  -H "X-API-Key: %API_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"tool\": \"analyze_wyckoff_phase\", \"params\": {\"symbol\": \"BTCUSDT\", \"timeframe\": \"60\"}}" ^
  | python -m json.tool
echo.

echo 5. Testing Complete Analysis...
curl -s -X POST http://localhost:8000/api/v1/mcp/call ^
  -H "X-API-Key: %API_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"tool\": \"get_complete_analysis\", \"params\": {\"symbol\": \"BTCUSDT\"}}" ^
  -o analysis.json
echo Analysis saved to analysis.json (first 500 chars):
python -c "import json; data=json.load(open('analysis.json')); print(json.dumps(data, indent=2)[:500] + '...')"
del analysis.json
echo.

echo =========================================
echo Test Complete!
echo =========================================
pause
