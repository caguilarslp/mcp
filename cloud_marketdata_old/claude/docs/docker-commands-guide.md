# 🐳 Guía de Comandos Docker - Cloud MarketData

## 🎯 Filosofía: Docker Directo
Este proyecto utiliza exclusivamente comandos Docker y Docker Compose, sin abstracciones como Makefiles. Esto garantiza:
- **Transparencia**: Comandos estándar de la industria
- **Portabilidad**: Funcionan en cualquier entorno con Docker
- **Simplicidad**: Sin dependencias adicionales
- **Flexibilidad**: Fácil personalización y debugging

## 🚀 Quick Start

```bash
# 1. Setup inicial
cp .env.example .env

# 2. Iniciar desarrollo con herramientas
docker-compose --profile dev up -d

# 3. Verificar estado
docker-compose ps
curl http://localhost:8000/health | python -m json.tool
```

## 🔧 Comandos por Categoría

### 📊 Estado y Monitoreo
```bash
# Ver estado de todos los servicios
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f

# Logs de servicio específico
docker-compose logs -f app
docker-compose logs -f mongodb
docker-compose logs -f redis

# Recursos del sistema
docker stats $(docker-compose ps -q)

# Health checks
curl http://localhost:8000/health
curl http://localhost:8000/ping
curl http://localhost:8000/
```

### 🚀 Inicio y Parada
```bash
# Iniciar todos los servicios
docker-compose up -d

# Iniciar con herramientas de desarrollo
docker-compose --profile dev up -d

# Iniciar en foreground (ver logs)
docker-compose up

# Parar todos los servicios
docker-compose down

# Parar y eliminar volúmenes
docker-compose down -v

# Reiniciar todos los servicios
docker-compose restart

# Reiniciar servicio específico
docker-compose restart app
```

### 🔨 Build y Deploy
```bash
# Build de la aplicación
docker-compose build app

# Build sin cache
docker-compose build --no-cache app

# Build y start
docker-compose up --build -d

# Validar configuración
docker-compose config

# Deploy producción
docker-compose -f docker-compose.yml up -d
```

### 🔍 Acceso a Contenedores
```bash
# Shell en aplicación
docker-compose exec app bash

# Python REPL en aplicación
docker-compose exec app python

# MongoDB shell
docker-compose exec mongodb mongosh cloud_marketdata

# Redis CLI
docker-compose exec redis redis-cli

# Ver procesos en contenedors
docker-compose top
```

### 🧪 Testing y Debugging
```bash
# Ejecutar tests
docker-compose exec app python -m pytest -v

# Tests con coverage
docker-compose exec app python -m pytest --cov=src --cov-report=html

# Test específico
docker-compose exec app python -m pytest tests/test_health.py -v

# Debugger remoto (si configurado)
docker-compose exec app python -m pdb src/main.py

# Ver variables de entorno
docker-compose exec app env | grep -E "(MONGO|REDIS|LOG)"
```

### 🗄️ Base de Datos
```bash
# MongoDB operations
docker-compose exec mongodb mongosh cloud_marketdata --eval "db.stats()"
docker-compose exec mongodb mongosh cloud_marketdata --eval "show collections"
docker-compose exec mongodb mongosh cloud_marketdata --eval "db.trades.countDocuments()"

# Reset database
docker-compose exec mongodb mongosh cloud_marketdata --eval "db.dropDatabase()"

# Backup database
docker-compose exec mongodb mongodump --db cloud_marketdata --out /tmp/backup

# Redis operations
docker-compose exec redis redis-cli info
docker-compose exec redis redis-cli keys "*"
docker-compose exec redis redis-cli flushall
```

### 🧹 Limpieza y Mantenimiento
```bash
# Parar y limpiar containers
docker-compose down

# Limpiar containers y volúmenes
docker-compose down -v

# Limpiar containers, redes y volúmenes
docker-compose down -v --remove-orphans

# Limpiar imágenes también
docker-compose down -v --rmi all

# Limpieza general de Docker
docker system prune -f

# Limpieza agresiva
docker system prune -a -f
docker volume prune -f
docker network prune -f
```

## 🌍 Entornos y Perfiles

### Development Profile
```bash
# Incluye MongoDB Express + Redis Commander
docker-compose --profile dev up -d

# Acceso web tools:
# - MongoDB Express: http://localhost:8082 (admin/admin123)
# - Redis Commander: http://localhost:8081
```

### Production Profile
```bash
# Solo servicios esenciales
docker-compose up -d

# Con overrides de producción
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 🔧 Troubleshooting

### Problemas Comunes
```bash
# Puertos ocupados
docker-compose down
sudo lsof -i :8000  # Ver qué usa el puerto
sudo netstat -tulpn | grep :8000

# Problemas de permisos
docker-compose exec app ls -la /app
docker-compose exec app whoami

# Problemas de conexión BD
docker-compose exec app ping mongodb
docker-compose exec app nslookup mongodb

# Ver logs de error
docker-compose logs --tail=50 app
docker-compose logs --since="1h" app

# Recrear contenedores
docker-compose up --force-recreate -d

# Verificar red Docker
docker network ls
docker network inspect cloud_marketdata_marketdata
```

### Debug de Configuración
```bash
# Verificar variables de entorno
docker-compose config

# Ver configuración efectiva
docker-compose exec app python -c "from src.core.config import Settings; print(Settings().model_dump_json(indent=2))"

# Test conectividad bases de datos
docker-compose exec app python -c "
import pymongo, redis
try:
    pymongo.MongoClient('mongodb://mongodb:27017/').admin.command('ping')
    print('MongoDB: OK')
except: print('MongoDB: FAIL')
try:
    redis.Redis.from_url('redis://redis:6379/0').ping()
    print('Redis: OK')
except: print('Redis: FAIL')
"
```

### Performance Monitoring
```bash
# Recursos en tiempo real
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Logs con timestamps
docker-compose logs -f -t

# Métricas del sistema
docker system df
docker system events --since="1h"

# Análisis de imágenes
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

## 📚 Referencias Rápidas

### Health Endpoints
- http://localhost:8000/health - Estado detallado
- http://localhost:8000/ping - Ping simple
- http://localhost:8000/ - Info del sistema
- http://localhost:8000/docs - API docs (dev only)

### Web Tools (Profile dev)
- http://localhost:8082 - MongoDB Express
- http://localhost:8081 - Redis Commander

### Puertos por Defecto
- 8000: FastAPI Application  
- 27017: MongoDB
- 6379: Redis
- 8081: Redis Commander (dev)
- 8082: MongoDB Express (dev)

### Archivos Clave
- `docker-compose.yml` - Configuración principal
- `.env` - Variables de entorno
- `Dockerfile` - Build de la aplicación
- `requirements.txt` - Dependencias Python

---

*Guía actualizada para comandos Docker directos sin Makefile*
