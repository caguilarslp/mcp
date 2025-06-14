# Cloud MarketData MCP Server - Docker Commands

## 🚀 Quick Start

```bash
# Setup environment
cp .env.example .env

# Start development environment
docker-compose --profile dev up -d

# Check status
docker-compose ps
```

## 🔧 Development Commands

### Basic Operations
```bash
# Start all services
docker-compose up -d

# Start with development tools (MongoDB Express, Redis Commander)
docker-compose --profile dev up -d

# Stop all services
docker-compose down

# Restart all services
docker-compose restart

# View logs
docker-compose logs -f

# View app logs only
docker-compose logs -f app
```

### Build Commands
```bash
# Build application image
docker-compose build app

# Force rebuild without cache
docker-compose build --no-cache app

# Build and start
docker-compose up --build -d
```

### Container Access
```bash
# Access application container
docker-compose exec app bash

# Access MongoDB shell
docker-compose exec mongodb mongosh cloud_marketdata

# Access Redis CLI
docker-compose exec redis redis-cli
```

### Health & Status
```bash
# Check container status
docker-compose ps

# Check application health
curl http://localhost:8000/health

# Ping application
curl http://localhost:8000/ping

# Container resource usage
docker stats
```

### Testing
```bash
# Run all tests
docker-compose exec app python -m pytest -v

# Run MCP tests specifically
docker-compose exec app python -m pytest tests/mcp/test_mcp.py -v

# Run tests with coverage
docker-compose exec app python -m pytest --cov=src --cov-report=html

# Test MCP connectivity via HTTP
curl http://localhost:8000/mcp/ping?message="Docker test"
curl http://localhost:8000/mcp/info
```

### Database Operations
```bash
# Reset MongoDB database
docker-compose exec mongodb mongosh cloud_marketdata --eval "db.dropDatabase()"

# Create database backup
docker-compose exec mongodb mongodump --db cloud_marketdata --out /tmp/backup
```

### Cleanup
```bash
# Stop and remove containers, networks
docker-compose down

# Stop and remove containers, networks, volumes
docker-compose down -v

# Remove unused Docker resources
docker system prune -f

# Deep cleanup (remove images too)
docker-compose down -v --rmi all
docker system prune -a -f
```

## 🌍 Development Environment

### Access Points
- **Application**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **MCP Ping Tool**: http://localhost:8000/mcp/ping
- **MCP System Info**: http://localhost:8000/mcp/info
- **MongoDB Express**: http://localhost:8082 (dev profile)
- **Redis Commander**: http://localhost:8081 (dev profile)

### Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env  # or your preferred editor

# Validate environment
docker-compose config
```

## 🚀 Production Commands

```bash
# Production deployment
docker-compose -f docker-compose.yml up -d

# Production with external compose file
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 📊 Monitoring

```bash
# Real-time container stats
docker stats $(docker-compose ps -q)

# Container resource usage
docker-compose top

# Application logs with timestamps
docker-compose logs -f -t app

# System health check
curl -s http://localhost:8000/health | python -m json.tool
```

## 🔧 Troubleshooting

```bash
# Check Docker Compose configuration
docker-compose config

# Validate compose file
docker-compose config --quiet

# Check service dependencies
docker-compose ps --services

# Inspect specific service
docker-compose logs app
docker-compose logs mongodb
docker-compose logs redis
```
