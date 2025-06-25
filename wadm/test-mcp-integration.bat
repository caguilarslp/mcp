@echo off
REM Test MCP Integration in WADM

echo =========================================
echo Testing MCP Server Integration
echo =========================================
echo.

echo 1. Testing MCP Health via API...
curl -s http://localhost:8000/api/v1/mcp/health -H "X-API-Key: wadm_dev_master_key_2025" | python -m json.tool
echo.

echo 2. Listing MCP Tools...
curl -s http://localhost:8000/api/v1/mcp/tools -H "X-API-Key: wadm_dev_master_key_2025" | python -m json.tool | head -20
echo.

echo 3. Testing Market Data (get_ticker)...
curl -s -X POST http://localhost:8000/api/v1/mcp/call ^
  -H "X-API-Key: wadm_dev_master_key_2025" ^
  -H "Content-Type: application/json" ^
  -d "{\"tool\": \"get_ticker\", \"params\": {\"symbol\": \"BTCUSDT\"}}" ^
  | python -m json.tool
echo.

echo 4. Testing Wyckoff Analysis...
curl -s -X POST http://localhost:8000/api/v1/mcp/call ^
  -H "X-API-Key: wadm_dev_master_key_2025" ^
  -H "Content-Type: application/json" ^
  -d "{\"tool\": \"analyze_wyckoff_phase\", \"params\": {\"symbol\": \"BTCUSDT\", \"timeframe\": \"60\"}}" ^
  | python -m json.tool
echo.

echo =========================================
echo Test Complete
echo =========================================
