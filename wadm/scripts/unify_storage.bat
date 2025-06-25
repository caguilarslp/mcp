@echo off
REM WADM Storage Unification Script for Windows
REM Purpose: Configure both services to use the same MongoDB instance

echo 🔧 WADM Storage Unification - Windows Edition
echo =============================================

REM Step 1: Check current MongoDB status
echo 📊 Checking current MongoDB collections...
docker exec wadm-mongo-1 mongosh -u wadm -p wadm_secure_2024 --authenticationDatabase admin --eval "use wadm; db.getCollectionNames().forEach(function(c) { print(c + ': ' + db[c].countDocuments() + ' docs'); })"

REM Step 2: Create docker-compose override for unified storage
echo.
echo 🔄 Creating docker-compose.override.yml for unified storage...

(
echo # WADM Storage Unification Override
echo # This ensures both services use the SAME MongoDB
echo.
echo services:
echo   mcp-server:
echo     environment:
echo       # Force MCP to use the main MongoDB ^(same as backend^)
echo       - MONGODB_URI=mongodb://wadm:wadm_secure_2024@mongo:27017/wadm?authSource=admin
echo       - MONGODB_CONNECTION_STRING=mongodb://wadm:wadm_secure_2024@mongo:27017/wadm?authSource=admin
echo       - MONGODB_DATABASE=wadm
echo       - STORAGE_STRATEGY=mongo_only
echo       - HYBRID_STORAGE_ENABLED=false
echo     volumes:
echo       # Keep existing volumes but prioritize MongoDB
echo       - ./mcp_server/storage:/app/storage
echo       - ./mcp_server/logs:/app/logs
echo       - ./mcp_server/reports:/app/reports
echo.
echo   backend:
echo     environment:
echo       # Ensure backend uses same connection string
echo       - DATABASE_URL=mongodb://wadm:wadm_secure_2024@mongo:27017/wadm?authSource=admin
echo       - MONGODB_URI=mongodb://wadm:wadm_secure_2024@mongo:27017/wadm?authSource=admin
echo.
echo   collectors:
echo     environment:
echo       # Collectors also use same DB
echo       - DATABASE_URL=mongodb://wadm:wadm_secure_2024@mongo:27017/wadm?authSource=admin
echo       - MONGODB_URI=mongodb://wadm:wadm_secure_2024@mongo:27017/wadm?authSource=admin
) > docker-compose.override.yml

echo ✅ Created docker-compose.override.yml

REM Step 3: Restart services with new configuration
echo.
echo 🔄 Restarting services with unified storage...
docker-compose down
docker-compose up -d

REM Step 4: Wait for services to initialize
echo.
echo ⏳ Waiting for services to initialize (30 seconds)...
timeout /t 30 /nobreak > nul

REM Step 5: Verify collections after restart
echo.
echo 📊 Verifying MongoDB collections after unification...
docker exec wadm-mongo-1 mongosh -u wadm -p wadm_secure_2024 --authenticationDatabase admin --eval "use wadm; print('Collections found:'); db.getCollectionNames().forEach(function(c) { print('- ' + c + ': ' + db[c].countDocuments() + ' documents'); })"

REM Step 6: Test MCP connection to MongoDB
echo.
echo 🧪 Testing MCP Server MongoDB connection...
curl -X GET "http://localhost:8001/health" -H "Content-Type: application/json" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ MCP Server is responding
) else (
    echo ⚠️  MCP Server might still be starting up
)

REM Step 7: Test a simple MCP analysis to verify MongoDB usage
echo.
echo 🧪 Testing MCP analysis (should write to unified MongoDB)...
curl -X POST "http://localhost:8000/api/v1/mcp/analyze/technical/BTCUSDT" ^
     -H "Content-Type: application/json" ^
     -H "X-API-Key: test-key" ^
     -d "{\"session_id\": \"test-unification\"}" 2>nul

timeout /t 5 /nobreak > nul

REM Step 8: Final verification - Check for analysis data in MongoDB
echo.
echo ✅ Final MongoDB verification:
docker exec wadm-mongo-1 mongosh -u wadm -p wadm_secure_2024 --authenticationDatabase admin --eval "use wadm; db.getCollectionNames().filter(c => c.includes('indicator') || c.includes('analysis') || c.includes('bollinger') || c.includes('smc')).forEach(function(c) { print('📈 ' + c + ': ' + db[c].countDocuments() + ' entries'); })"

echo.
echo 🎯 Storage Unification Complete!
echo ================================
echo Both Backend API and MCP Server now use the SAME MongoDB instance.
echo All collections should now be visible and accessible.
echo.
echo Next steps:
echo 1. Check frontend at http://localhost:3000
echo 2. Verify indicators are calculating: docker-compose logs -f mcp-server
echo 3. Check backend logs: docker-compose logs -f backend
echo.
echo 🚀 FASE 1 COMPLETADA - MongoDB Unificado!

pause 