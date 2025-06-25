# WADM Docker Services Guide - DEFINITIVE

## 📋 **OFFICIAL SERVICE NAMES** (NEVER CHANGE):

| Service | Container Name | Port | Purpose |
|---------|---------------|------|---------|
| `frontend` | `wadm-frontend-1` | 3000 | React Dashboard + TradingView Charts |
| `backend` | `wadm-backend-1` | 8000 | FastAPI + MongoDB + Redis |
| `collectors` | `wadm-collectors-1` | - | WebSocket Data Collection (4 exchanges) |
| `mcp-server` | `wadm-mcp-server-1` | 8001 | 133 Analysis Tools |
| `mongo` | `wadm-mongo-1` | 27017 | MongoDB Database |
| `redis` | `wadm-redis-1` | 6379 | Cache & Sessions |

## 🚀 **ESSENTIAL COMMANDS**:

### Start/Stop Services
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d frontend
docker-compose up -d backend
docker-compose up -d collectors

# Stop all services
docker-compose down

# Restart specific service
docker-compose restart collectors
```

### View Logs
```bash
# View logs for specific services (OFFICIAL NAMES)
docker-compose logs frontend
docker-compose logs backend
docker-compose logs collectors
docker-compose logs mcp-server
docker-compose logs mongo
docker-compose logs redis

# Follow logs in real-time
docker-compose logs -f collectors
docker-compose logs -f backend

# Last 50 lines
docker-compose logs --tail=50 collectors
```

### Service Status
```bash
# View all containers
docker ps

# View service health
docker-compose ps
```

### Build/Rebuild
```bash
# Rebuild specific service
docker-compose build frontend
docker-compose build backend
docker-compose build collectors
docker-compose build mcp-server

# Force rebuild (no cache)
docker-compose build --no-cache backend

# Rebuild and restart
docker-compose up --build -d collectors
```

## 🌐 **ACCESS URLS**:

- **Frontend Dashboard**: `http://localhost:3000`
- **Backend API Docs**: `http://localhost:8000/api/docs`
- **Backend Health**: `http://localhost:8000/api/v1/system/health`
- **MCP Server Health**: `http://localhost:8001`

## 🗄️ **DATABASE CONNECTIONS**:

### MongoDB
```bash
# Internal (containers)
mongodb://wadm:wadm_secure_2024@mongo:27017/wadm?authSource=admin

# External (MongoDB Compass)
mongodb://wadm:wadm_secure_2024@localhost:27017/wadm?authSource=admin
```

### Redis
```bash
# Internal (containers)
redis://:wadm_redis_2024@redis:6379

# External (Redis CLI)
redis-cli -h localhost -p 6379 -a wadm_redis_2024
```

## 📊 **DATA COLLECTION STATUS**:

### Check if collectors are working
```bash
# View collectors logs
docker-compose logs collectors

# Should show:
# ✅ Bybit collector initialized
# ✅ Coinbase Pro collector initialized  
# ✅ Kraken collector initialized
```

### Check database data
```bash
# View MongoDB logs
docker-compose logs mongo

# Connect to MongoDB and check collections
docker exec -it wadm-mongo-1 mongosh -u wadm -p wadm_secure_2024 --authenticationDatabase admin
```

## 🚨 **TROUBLESHOOTING**:

### Service Won't Start
```bash
# Check logs for errors
docker-compose logs [service-name]

# Rebuild service
docker-compose build [service-name]
docker-compose up -d [service-name]
```

### Database Connection Issues
```bash
# Check MongoDB status
docker-compose logs mongo

# Check backend MongoDB connection
docker-compose logs backend | grep -i mongo

# Restart database services
docker-compose restart mongo redis
```

### Clear Everything
```bash
# Stop all services
docker-compose down

# Remove containers and volumes
docker-compose down -v

# Rebuild everything
docker-compose build --no-cache
docker-compose up -d
```

## ⚠️ **IMPORTANT RULES**:

1. **NEVER change service names** in docker-compose.yml
2. **Always use official service names** in logs commands
3. **Document any changes** in this guide
4. **Test all commands** before updating documentation 