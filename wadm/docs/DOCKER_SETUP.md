# WADM Docker Setup Guide

## 🚀 Quick Start (30 seconds)

### Prerequisites
- Docker Desktop installed and running
- 4GB RAM available
- 10GB disk space

### Installation
```bash
# Clone and enter directory
cd D:\projects\mcp\wadm

# Start everything (Windows)
scripts\wadm-dev.bat start

# Start everything (Linux/Mac)
./scripts/wadm-dev.sh start
```

### Access Points
- **API Server**: http://localhost:8000
- **API Documentation**: http://localhost:8000/api/docs
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

## 📁 Docker Architecture

### Services Overview
```yaml
wadm-api:     # Python 3.12 + FastAPI + WADM Core
mongodb:      # MongoDB 7 with authentication
redis:        # Redis 7 with persistence
nginx:        # Reverse proxy (optional)
```

### Network Configuration
- **Network**: `wadm-network` (bridge)
- **Internal communication**: Services communicate via service names
- **External access**: Only specific ports exposed to host

### Volume Management
```yaml
mongodb_data:     # MongoDB database files
redis_data:       # Redis persistence
wadm_logs:        # Application logs
nginx_logs:       # Nginx access/error logs (if enabled)
```

## 🛠️ Development Workflow

### Starting Development Environment
```bash
# Using helper script (recommended)
scripts\wadm-dev.bat start

# Or using docker-compose directly
docker-compose up -d
```

### Viewing Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f wadm-api
docker-compose logs -f mongodb
docker-compose logs -f redis
```

### Accessing Containers
```bash
# Open shell in API container
docker-compose exec wadm-api bash

# Open MongoDB shell
docker-compose exec mongodb mongosh wadm

# Open Redis CLI
docker-compose exec redis redis-cli
```

### Code Changes (Hot Reload)
- **Development mode**: Code changes reload automatically
- **Volume mounting**: Source code is mounted from host
- **Configuration**: Set `API_RELOAD=true` in environment

## 🔧 Configuration

### Environment Variables
Configuration is handled through environment variables:

```bash
# Database
MONGODB_URL=mongodb://wadm:wadm_secure_pass_2025@mongodb:27017/wadm
REDIS_URL=redis://redis:6379/0

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_DEBUG=true
API_RELOAD=true

# Application
LOG_LEVEL=INFO
ENVIRONMENT=development

# Exchange WebSocket URLs
BYBIT_WS_URL=wss://stream.bybit.com/v5/public/spot
BINANCE_WS_URL=wss://stream.binance.com:9443/ws
COINBASE_WS_URL=wss://ws-feed.exchange.coinbase.com
KRAKEN_WS_URL=wss://ws.kraken.com

# Security
API_MASTER_KEY=wadm_dev_master_key_2025
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

### Environment Files
1. **Development**: Uses `.env` (created from `.env.template`)
2. **Production**: Uses environment-specific variables
3. **Docker**: Override via `docker-compose.yml` environment section

## 🏭 Production Deployment

### Production Configuration
```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d

# With environment file
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### Production Features
- **Multi-worker**: 4 workers for horizontal scaling
- **Resource limits**: Memory and CPU constraints
- **Health checks**: Automatic restart on failure
- **Nginx proxy**: Load balancing and SSL termination
- **Log rotation**: Automatic log management
- **Backup volumes**: Data persistence strategies

### Production Environment Variables
```bash
# Required for production
MONGO_PASSWORD=your_secure_password
API_MASTER_KEY=your_secure_api_key
ALLOWED_ORIGINS=https://yourdomain.com

# Optional optimizations
WORKERS=4
MAX_CONNECTIONS=1000
LOG_LEVEL=WARNING
```

## 📊 Monitoring & Health Checks

### Service Health
```bash
# Check all services
docker-compose ps

# Health check endpoints
curl http://localhost:8000/api/v1/system/health
curl http://localhost:8000/api/v1/system/database
```

### Performance Monitoring
```bash
# Container stats
docker stats

# Service-specific stats
docker stats wadm-api
docker stats wadm-mongodb
docker stats wadm-redis
```

### Log Analysis
```bash
# Follow logs with timestamps
docker-compose logs -f -t wadm-api

# Filter by log level
docker-compose logs wadm-api | grep ERROR

# Export logs
docker-compose logs --no-color wadm-api > wadm-api.log
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find what's using port 8000
netstat -ano | findstr :8000

# Stop conflicting service or change port
set API_PORT=8001
docker-compose up -d
```

#### 2. MongoDB Connection Issues
```bash
# Check MongoDB logs
docker-compose logs mongodb

# Test connection manually
docker-compose exec mongodb mongosh wadm --eval "db.stats()"

# Reset MongoDB data
docker-compose down -v
docker-compose up -d
```

#### 3. Redis Connection Timeouts
```bash
# Check Redis status
docker-compose exec redis redis-cli ping

# Restart Redis
docker-compose restart redis

# Check Redis logs
docker-compose logs redis
```

#### 4. API Not Starting
```bash
# Check Python errors
docker-compose logs wadm-api

# Rebuild container
docker-compose build --no-cache wadm-api
docker-compose up -d
```

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG
docker-compose restart wadm-api

# Access debug endpoints
curl http://localhost:8000/api/v1/system/debug
```

## 🧹 Maintenance

### Data Backup
```bash
# MongoDB backup
docker-compose exec mongodb mongodump --out /backups/$(date +%Y%m%d)

# Copy backup to host
docker cp $(docker-compose ps -q mongodb):/backups ./backups/

# Redis backup
docker-compose exec redis redis-cli --rdb dump.rdb
```

### Cleanup
```bash
# Stop and remove everything
scripts\wadm-dev.bat clean

# Or manually
docker-compose down -v --remove-orphans
docker system prune -f
```

### Updates
```bash
# Update to latest images
docker-compose pull
docker-compose up -d

# Rebuild custom images
docker-compose build --pull
docker-compose up -d
```

## ⚡ Performance Optimization

### Development Mode
- **Single worker**: Faster startup
- **Hot reload**: Immediate code changes
- **Debug logging**: Detailed information
- **No resource limits**: Full system access

### Production Mode
- **Multiple workers**: Horizontal scaling
- **No reload**: Better performance
- **Optimized logging**: Reduced overhead
- **Resource limits**: Predictable resource usage
- **Health checks**: Automatic recovery

### Resource Allocation
```yaml
# Development (docker-compose.yml)
# No limits - uses system resources as needed

# Production (docker-compose.prod.yml)
deploy:
  resources:
    limits:
      memory: 1G      # Maximum memory
      cpus: '2.0'     # Maximum CPU cores
    reservations:
      memory: 512M    # Reserved memory
      cpus: '1.0'     # Reserved CPU cores
```

## 🔒 Security Considerations

### Development
- **Default passwords**: OK for local development
- **Open CORS**: Allows all origins
- **Debug mode**: Detailed error messages
- **No SSL**: HTTP only

### Production
- **Strong passwords**: Required for all services
- **Restricted CORS**: Specific origins only
- **Production mode**: Limited error information
- **SSL/TLS**: HTTPS with certificates
- **Network isolation**: Internal communication only

### Best Practices
1. **Use environment files**: Never hardcode secrets
2. **Rotate credentials**: Regular password changes
3. **Monitor access**: Log all API requests
4. **Update regularly**: Keep images up to date
5. **Backup strategy**: Regular automated backups

## 📚 Additional Resources

### Docker Commands Reference
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Rebuild and start
docker-compose up --build -d

# View logs
docker-compose logs -f [service]

# Execute commands
docker-compose exec [service] [command]

# Scale services
docker-compose up -d --scale wadm-api=3
```

### Helper Scripts
- **`scripts/wadm-dev.bat`**: Windows development helper
- **`scripts/wadm-dev.sh`**: Linux/Mac development helper
- **`scripts/wait-for-services.sh`**: Service dependency management

### Configuration Files
- **`Dockerfile`**: Application container definition
- **`docker-compose.yml`**: Development environment
- **`docker-compose.prod.yml`**: Production environment
- **`.env.template`**: Environment variables template

## 🎯 Next Steps

1. **Start Development**: `scripts\wadm-dev.bat start`
2. **Access API Docs**: http://localhost:8000/api/docs
3. **Test Endpoints**: Use Swagger UI or curl
4. **Monitor Logs**: `docker-compose logs -f wadm-api`
5. **Develop Features**: Code changes auto-reload

For production deployment, see the Production section above and ensure all security considerations are addressed.
