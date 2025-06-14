# 🐳 Cloud MarketData MCP Server

Professional-grade microservice for real-time market data collection and processing with MCP (Model Context Protocol) integration.

## 🚀 Quick Start

```bash
# 1. Setup environment
git clone <repository>
cd cloud_marketdata
cp .env.example .env

# 2. Start development environment
docker-compose --profile dev up -d

# 3. Verify everything is running
docker-compose ps
curl http://localhost:8000/health
```

## 🎯 What's Included

- **FastAPI** application with health checks and structured logging
- **MongoDB** for persistent data storage with TTL indexes
- **Redis** for caching and pub/sub messaging
- **Development tools**: MongoDB Express, Redis Commander
- **Docker Compose** setup with dev/prod profiles
- **Environment-based configuration** with Pydantic Settings

## 🌍 Development Environment

Once running, you can access:

- **Application**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **MongoDB Express**: http://localhost:8082 (admin/admin123)
- **Redis Commander**: http://localhost:8081

## 🔧 Development Commands

See [DOCKER_COMMANDS.md](./DOCKER_COMMANDS.md) for comprehensive Docker commands.

### Essential Commands
```bash
# Start development with tools
docker-compose --profile dev up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down

# Access application container
docker-compose exec app bash

# Run tests
docker-compose exec app python -m pytest -v
```

## 📁 Project Structure

```
cloud_marketdata/
├── src/                    # Application source code
│   ├── core/              # Core utilities (config, logging)
│   ├── infrastructure/    # External adapters (coming soon)
│   ├── application/       # Use cases (coming soon)
│   └── presentation/      # API and MCP (coming soon)
├── tests/                 # Test suite
├── docker/                # Docker configuration
├── config/                # Configuration files
├── claude/                # Development documentation
└── DOCKER_COMMANDS.md     # Docker command reference
```

## 🎯 Roadmap

- [x] **TASK-001**: Docker + FastAPI base setup
- [ ] **TASK-001B**: FastMCP server integration
- [ ] **TASK-002A**: WebSocket collectors (Bybit)
- [ ] **TASK-002B**: Multiple exchange support
- [ ] **TASK-003A**: MongoDB schemas and repositories
- [ ] **TASK-004A**: Volume Profile calculations
- [ ] **TASK-005A**: Order Flow analysis

## 🔧 Configuration

Environment variables are loaded from `.env` file:

```bash
# Copy example and customize
cp .env.example .env
nano .env
```

Key configuration options:
- `MONGODB_URI`: MongoDB connection string
- `REDIS_URI`: Redis connection string
- `SYMBOLS`: Trading pairs to monitor
- `LOG_LEVEL`: Logging verbosity

## 🏗️ Architecture

This project follows Clean Architecture principles with:

- **Domain Layer**: Core business entities and rules
- **Application Layer**: Use cases and business logic
- **Infrastructure Layer**: External service adapters
- **Presentation Layer**: API endpoints and MCP tools

## 🔍 Health Monitoring

The application includes comprehensive health checks:

```bash
# Application health
curl http://localhost:8000/health

# System information
curl http://localhost:8000/

# Simple ping
curl http://localhost:8000/ping
```

## 🧪 Testing

```bash
# Run all tests
docker-compose exec app python -m pytest -v

# Run with coverage
docker-compose exec app python -m pytest --cov=src --cov-report=html

# Run specific test file
docker-compose exec app python -m pytest tests/test_specific.py -v
```

## 🚀 Production Deployment

```bash
# Production build
docker-compose build

# Production start
docker-compose up -d

# With production overrides
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 📊 Monitoring

Monitor your application:

```bash
# Container resource usage
docker stats $(docker-compose ps -q)

# Application logs
docker-compose logs -f app

# Database operations
docker-compose exec mongodb mongosh cloud_marketdata
```

## 🤝 Contributing

1. Follow the atomic task structure in `claude/tasks/task-tracker.md`
2. Each task should be completable in under 2 hours
3. Update documentation after each completed task
4. Use structured logging for all operations
5. Maintain type hints and async/await patterns

## 📚 Documentation

- [Task Tracker](./claude/tasks/task-tracker.md) - Development progress
- [Architecture](./claude/docs/arquitectura.md) - System design
- [Docker Commands](./DOCKER_COMMANDS.md) - Command reference
- [Integration Guide](./claude/docs/integracion-waickoff.md) - MCP integration

## 📝 License

This project is part of the wAIckoff Platform development.
