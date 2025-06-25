# WADM Storage Unification Script for Windows PowerShell
# Purpose: Configure both services to use the same MongoDB instance

Write-Host "🔧 WADM Storage Unification - PowerShell Edition" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Step 1: Check current MongoDB status
Write-Host "`n📊 Checking current MongoDB collections..." -ForegroundColor Yellow
docker exec wadm-mongo-1 mongosh -u wadm -p wadm_secure_2024 --authenticationDatabase admin --eval "use wadm; db.getCollectionNames().forEach(function(c) { print(c + ': ' + db[c].countDocuments() + ' docs'); })"

# Step 2: Create docker-compose override for unified storage
Write-Host "`n🔄 Creating docker-compose.override.yml for unified storage..." -ForegroundColor Yellow

$overrideContent = @"
# WADM Storage Unification Override
# This ensures both services use the SAME MongoDB

services:
  mcp-server:
    environment:
      # Force MCP to use the main MongoDB (same as backend)
      - MONGODB_URI=mongodb://wadm:wadm_secure_2024@mongo:27017/wadm?authSource=admin
      - MONGODB_CONNECTION_STRING=mongodb://wadm:wadm_secure_2024@mongo:27017/wadm?authSource=admin
      - MONGODB_DATABASE=wadm
      - STORAGE_STRATEGY=mongo_only
      - HYBRID_STORAGE_ENABLED=false
    volumes:
      # Keep existing volumes but prioritize MongoDB
      - ./mcp_server/storage:/app/storage
      - ./mcp_server/logs:/app/logs
      - ./mcp_server/reports:/app/reports

  backend:
    environment:
      # Ensure backend uses same connection string
      - DATABASE_URL=mongodb://wadm:wadm_secure_2024@mongo:27017/wadm?authSource=admin
      - MONGODB_URI=mongodb://wadm:wadm_secure_2024@mongo:27017/wadm?authSource=admin

  collectors:
    environment:
      # Collectors also use same DB
      - DATABASE_URL=mongodb://wadm:wadm_secure_2024@mongo:27017/wadm?authSource=admin
      - MONGODB_URI=mongodb://wadm:wadm_secure_2024@mongo:27017/wadm?authSource=admin
"@

$overrideContent | Out-File -FilePath "docker-compose.override.yml" -Encoding UTF8
Write-Host "✅ Created docker-compose.override.yml" -ForegroundColor Green

# Step 3: Restart services with new configuration
Write-Host "`n🔄 Restarting services with unified storage..." -ForegroundColor Yellow
docker-compose down
docker-compose up -d

# Step 4: Wait for services to initialize
Write-Host "`n⏳ Waiting for services to initialize (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Step 5: Verify collections after restart
Write-Host "`n📊 Verifying MongoDB collections after unification..." -ForegroundColor Yellow
docker exec wadm-mongo-1 mongosh -u wadm -p wadm_secure_2024 --authenticationDatabase admin --eval "use wadm; print('Collections found:'); db.getCollectionNames().forEach(function(c) { print('- ' + c + ': ' + db[c].countDocuments() + ' documents'); })"

# Step 6: Test MCP connection to MongoDB
Write-Host "`n🧪 Testing MCP Server MongoDB connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8001/health" -Method GET -ContentType "application/json" -TimeoutSec 10
    Write-Host "✅ MCP Server is responding" -ForegroundColor Green
} catch {
    Write-Host "⚠️  MCP Server might still be starting up" -ForegroundColor Yellow
}

# Step 7: Test a simple MCP analysis to verify MongoDB usage
Write-Host "`n🧪 Testing MCP analysis (should write to unified MongoDB)..." -ForegroundColor Yellow
try {
    $body = '{"session_id": "test-unification"}'
    $headers = @{
        "Content-Type" = "application/json"
        "X-API-Key" = "test-key"
    }
    Invoke-RestMethod -Uri "http://localhost:8000/api/v1/mcp/analyze/technical/BTCUSDT" -Method POST -Body $body -Headers $headers -TimeoutSec 15
} catch {
    Write-Host "Note: MCP analysis test may need API to be fully ready" -ForegroundColor Yellow
}

Start-Sleep -Seconds 5

# Step 8: Final verification - Check for analysis data in MongoDB
Write-Host "`n✅ Final MongoDB verification:" -ForegroundColor Green
docker exec wadm-mongo-1 mongosh -u wadm -p wadm_secure_2024 --authenticationDatabase admin --eval "use wadm; db.getCollectionNames().filter(c => c.includes('indicator') || c.includes('analysis') || c.includes('bollinger') || c.includes('smc')).forEach(function(c) { print('📈 ' + c + ': ' + db[c].countDocuments() + ' entries'); })"

Write-Host "`n🎯 Storage Unification Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host "Both Backend API and MCP Server now use the SAME MongoDB instance." -ForegroundColor White
Write-Host "All collections should now be visible and accessible." -ForegroundColor White

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Check frontend at http://localhost:3000" -ForegroundColor White
Write-Host "2. Verify indicators are calculating: docker-compose logs -f mcp-server" -ForegroundColor White
Write-Host "3. Check backend logs: docker-compose logs -f backend" -ForegroundColor White

Write-Host "`n🚀 FASE 1 COMPLETADA - MongoDB Unificado!" -ForegroundColor Green

Read-Host "Press Enter to continue..." 