# 🐳 Docker Commands Reference v1.4

## 🚀 Quick Start Commands

### 🔧 Initial Setup
```bash
# 1. Copy environment file
cp .env.example .env

# 2. Start development environment
docker-compose --profile dev up --build -d

# 3. Verify all services are running
docker-compose ps
```

### ✅ Health Check
```bash
# Basic health check
curl http://localhost:8000/health

# Expected response (should show collector_manager: "healthy")
{
  "status": "healthy",
  "services": {
    "api": "healthy",
    "mcp_server": "healthy",
    "collector_manager": "healthy",
    "collectors": "1/1 active"
  }
}
```

## 📊 Monitoring & Verification

### 🔍 Application Status
```bash
# View application logs (real-time)
docker-compose logs -f app

# Filter collector-specific logs
docker-compose logs -f app | grep -i "collector\|trade"

# View last 50 log entries
docker-compose logs --tail=50 app
```

### 📈 Data Verification  
```bash
# Check collectors status
curl http://localhost:8000/collectors/status

# Check specific collector
curl http://localhost:8000/collectors/status/bybit_trades

# View recent trades (should show BTCUSDT trades)
curl "http://localhost:8000/collectors/trades?limit=5"

# View storage statistics
curl http://localhost:8000/collectors/storage/stats

# Monitor trades per second (continuous)
watch -n 10 'curl -s http://localhost:8000/collectors/storage/stats | jq ".trades_per_second, .current_trades_stored"'
```

### 🔧 MCP Testing
```bash
# Test MCP ping tool
curl "http://localhost:8000/mcp/ping?message=test"

# Test MCP system info
curl http://localhost:8000/mcp/info
```

## 🔄 Development Workflow

### 🛠️ Development Commands
```bash
# Start dev environment with rebuild
docker-compose --profile dev up --build -d

# View all running services
docker-compose ps

# Restart specific service
docker-compose restart app

# View service logs
docker-compose logs -f app
docker-compose logs -f mongo
docker-compose logs -f redis
```

### 🧪 Testing & Debugging
```bash
# Access app container shell
docker-compose exec app bash

# Run tests (when available)
docker-compose exec app python -m pytest -v

# Check Python environment
docker-compose exec app python --version
docker-compose exec app pip list

# Verify connectivity to external APIs
docker-compose exec app ping stream.bybit.com
```

## 🗄️ Database Management

### 📊 MongoDB (Port 27017)
```bash
# Access MongoDB shell
docker-compose exec mongo mongosh cloud_marketdata

# View MongoDB Express (Web UI)
# http://localhost:8082

# MongoDB commands (inside mongosh)
show dbs
use cloud_marketdata
show collections
db.trades.find().limit(5)
```

### ⚡ Redis (Port 6379)
```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# View Redis Commander (Web UI)
# http://localhost:8081

# Redis commands (inside redis-cli)
INFO
KEYS *
GET key_name
```

## 🔧 Maintenance & Cleanup

### 🧹 Cleanup Commands
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clears data)
docker-compose down -v

# Remove unused Docker objects
docker system prune -f

# Rebuild everything from scratch
docker-compose down -v
docker-compose --profile dev up --build -d
```

### 📦 Container Management
```bash
# View container resource usage
docker stats

# View detailed container info
docker-compose exec app ps aux

# Restart services in order
docker-compose restart redis mongo app
```

## 🚨 Troubleshooting

### ❌ Common Issues

#### 1. Application Won't Start
```bash
# Check for port conflicts
netstat -tulpn | grep -E ':(8000|27017|6379)'

# Check container logs for errors
docker-compose logs app | grep -i error

# Rebuild with no cache
docker-compose build --no-cache
docker-compose --profile dev up -d
```

#### 2. Import Errors (Fixed in v0.1.4)
```bash
# Check for Python import issues
docker-compose logs app | grep -i "import\|modulenotfound"

# The get_logger() fix is already applied
# If errors persist, rebuild:
docker-compose down
docker-compose --profile dev up --build -d
```

#### 3. WebSocket Connection Issues
```bash
# Test external connectivity
docker-compose exec app ping stream.bybit.com
docker-compose exec app nslookup stream.bybit.com

# Check WebSocket specific logs
docker-compose logs app | grep -i "websocket\|connect\|bybit"

# Verify collector status
curl http://localhost:8000/collectors/status/bybit_trades
```

#### 4. No Data Coming Through
```bash
# Check if collector is active
curl http://localhost:8000/collectors/status | jq '.collectors.bybit_trades.status'

# Should return "active"

# Check subscription success
docker-compose logs app | grep -i "subscrib"

# Verify trades are being stored
curl http://localhost:8000/collectors/storage/stats | jq '.current_trades_stored'
```

#### 5. High Memory Usage
```bash
# Check container memory usage
docker stats --no-stream

# Check application memory usage
docker-compose exec app ps aux --sort=-%mem

# Clear in-memory storage if needed
curl -X POST http://localhost:8000/collectors/storage/clear
```

## 🌐 Development URLs

### 📱 Application Endpoints
- **Main API**: http://localhost:8000
- **Health Check**: http://localhost:8000/health
- **API Docs**: http://localhost:8000/docs (dev only)
- **ReDoc**: http://localhost:8000/redoc (dev only)

### 🔧 Development Tools
- **MongoDB Express**: http://localhost:8082
- **Redis Commander**: http://localhost:8081

### 📊 Monitoring Endpoints
- **Collectors Status**: http://localhost:8000/collectors/status
- **Recent Trades**: http://localhost:8000/collectors/trades?limit=10
- **Storage Stats**: http://localhost:8000/collectors/storage/stats

## 📋 Environment Profiles

### 🧪 Development Profile (--profile dev)
```bash
docker-compose --profile dev up -d
```
**Includes**: app, mongo, redis, mongo-express, redis-commander

### 🚀 Production Profile (default)
```bash
docker-compose up -d
```
**Includes**: app, mongo, redis (no dev tools)

## 🔄 Update Workflow

### 📥 Pulling Changes
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose --profile dev up --build -d

# Verify everything works
curl http://localhost:8000/health
```

### 🔄 Configuration Changes
```bash
# Update .env file
nano .env

# Restart services to pick up changes
docker-compose restart app
```

## ⚡ Performance Optimization

### 🚀 Startup Performance
```bash
# Pre-pull images
docker-compose pull

# Build in parallel
docker-compose build --parallel

# Use build cache
docker-compose up --build -d
```

### 📊 Runtime Performance
```bash
# Monitor real-time stats
docker stats

# Check application metrics
curl http://localhost:8000/collectors/storage/stats | jq '{trades_per_second, uptime_seconds, memory_usage}'
```

---

**Última actualización**: 2025-06-14 - v1.4 con WebSocket collectors + Logger fix
