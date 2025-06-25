#!/bin/bash
# WADM Quick Storage Unification Script
# Purpose: Configure both services to use the same MongoDB instance

echo "🔧 WADM Storage Unification - Quick Fix"
echo "======================================="

# Step 1: Check current MongoDB status
echo "📊 Checking MongoDB collections..."
docker exec -it wadm-mongo-1 mongosh -u wadm -p wadm_secure_2024 --authenticationDatabase admin --eval "use wadm; db.getCollectionNames().forEach(function(c) { print(c + ': ' + db[c].countDocuments() + ' docs'); })"

# Step 2: Update MCP Server to use main MongoDB
echo -e "\n🔄 Updating MCP Server MongoDB configuration..."

# Create updated docker-compose override
cat > docker-compose.override.yml << 'EOF'
# WADM Storage Unification Override
# This ensures both services use the SAME MongoDB

services:
  mcp-server:
    environment:
      # Force MCP to use the main MongoDB (same as backend)
      - MONGODB_URI=mongodb://wadm:wadm_secure_2024@mongo:27017/wadm?authSource=admin
      - MONGODB_CONNECTION_STRING=mongodb://wadm:wadm_secure_2024@mongo:27017/wadm?authSource=admin
      - STORAGE_STRATEGY=mongo_only  # Disable file storage
      - HYBRID_STORAGE_ENABLED=false  # Use MongoDB exclusively
    volumes:
      # Remove file storage volumes to force MongoDB usage
      - /tmp/empty:/app/storage:ro
      - /tmp/empty:/app/reports:ro

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
EOF

echo "✅ Created docker-compose.override.yml"

# Step 3: Restart services with new config
echo -e "\n🔄 Restarting services with unified storage..."
docker-compose down
docker-compose up -d

# Wait for services to start
echo -e "\n⏳ Waiting for services to initialize (30s)..."
sleep 30

# Step 4: Verify collections after restart
echo -e "\n📊 Verifying MongoDB collections after unification..."
docker exec -it wadm-mongo-1 mongosh -u wadm -p wadm_secure_2024 --authenticationDatabase admin --eval "use wadm; print('\\nCollections found:'); db.getCollectionNames().forEach(function(c) { print('- ' + c + ': ' + db[c].countDocuments() + ' documents'); })"

# Step 5: Test MCP tools to ensure they're writing to MongoDB
echo -e "\n🧪 Testing MCP tool (should create indicators in MongoDB)..."
curl -X POST http://localhost:8000/api/v1/mcp/analyze/technical/BTCUSDT \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key" \
  -d '{"session_id": "test-session"}'

sleep 5

# Step 6: Final verification
echo -e "\n✅ Final MongoDB status:"
docker exec -it wadm-mongo-1 mongosh -u wadm -p wadm_secure_2024 --authenticationDatabase admin --eval "use wadm; db.getCollectionNames().filter(c => c.includes('indicator') || c.includes('analysis')).forEach(function(c) { print('📈 ' + c + ': ' + db[c].countDocuments() + ' entries'); })"

echo -e "\n🎯 Storage Unification Complete!"
echo "================================"
echo "Both services now use the SAME MongoDB instance."
echo "Missing collections should now be accessible."
echo ""
echo "Next steps:"
echo "1. Check frontend at http://localhost:3000"
echo "2. Verify indicators are calculating"
echo "3. Monitor logs: docker-compose logs -f mcp-server"
