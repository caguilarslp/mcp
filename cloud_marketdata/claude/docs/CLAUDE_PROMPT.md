# 📋 Cloud MarketData Development Prompt v1.2

## 🚀 Inicio Rápido
**Ubicación:** `D:\projects\mcp\cloud_marketdata`

### Protocolo de Lectura (30 segundos)
1. **Leer `.claude_context`** - Estado actual del proyecto
2. **Revisar `claude/master-log.md`** - Últimas entradas de desarrollo
3. **Verificar `claude/tasks/task-tracker.md`** - Tareas activas
4. **Consultar ADRs** si hay dudas arquitectónicas

### Reglas de Desarrollo
1. **Código primero** - Implementar, luego documentar
2. **NO usar artefactos** - Todo directo al filesystem
3. **Python 3.12 strict** - Type hints obligatorios
4. **Testing incluido** - TDD cuando sea posible
5. **Async by default** - Todo I/O debe ser asíncrono
6. **Logs estructurados** - JSON format para parsing
7. **🐳 SOLO DOCKER** - NO usar make, solo docker-compose

### Stack Tecnológico
- Python 3.12-slim + FastAPI + Pydantic v2
- FastMCP (estándar MCP)
- MongoDB + Redis + Celery
- Docker + docker-compose
- WebSocket Bybit v5 + Binance

## 🎯 Estado Actual
- **v0.1.2** En Desarrollo
- **1/16 tareas** completadas (6.25%)
- **Arquitectura**: Clean Architecture 4 capas
- **TASK-001**: ✅ COMPLETADA - Docker + FastAPI base
- **Próxima tarea**: TASK-001B FastMCP integration (1h)

## 📋 Tareas Prioritarias
1. **TASK-001**: ✅ Setup Docker + FastAPI base (completada)
2. **TASK-001B**: FastMCP integration (1h) - PRÓXIMA
3. **TASK-002A**: WebSocket base + Bybit trades (2h)
4. **TASK-002B**: OrderBook + Binance trades (2h)
5. **TASK-002C**: Production hardening (1.5h)

Ver `claude/tasks/task-tracker.md` para lista completa.

## 💡 Información Crítica
- **Objetivo**: Microservicio 24/7 para datos de mercado
- **Limitaciones VPS**: Storage limitado, CPU compartida
- **Retención**: 1h raw data, 24h agregados 1m, 7d agregados 1h
- **Performance target**: < 10ms por trade, 10k trades/seg

## 🐳 Comandos Esenciales (SOLO DOCKER)
```bash
# Desarrollo
docker-compose --profile dev up -d
docker-compose logs -f
docker-compose exec app python -m pytest -v

# Producción
docker-compose build
docker-compose up -d

# Estado y debugging
docker-compose ps
curl http://localhost:8000/health
docker-compose exec app bash
```

## 📁 Estructura del Proyecto
```
cloud_marketdata/
├── src/
│   ├── core/           # Entidades y lógica
│   ├── infrastructure/ # Adaptadores externos
│   ├── application/    # Casos de uso
│   └── presentation/   # API y MCP
├── tests/              # Tests con pytest
├── docker/             # Dockerfiles
├── claude/             # Documentación
├── DOCKER_COMMANDS.md  # Guía de comandos Docker
└── .env               # Variables de entorno
```

## 🏗️ Principios Arquitectónicos
1. **Clean Architecture** - Independencia de frameworks
2. **DDD** - Modelado rico del dominio
3. **SOLID** - Especialmente SRP y DIP
4. **Event-driven** - Comunicación vía eventos
5. **Fail-fast** - Errores tempranos y claros
6. **🐳 Docker-first** - Sin abstracciones como make

## 🔍 Sistema de Trazabilidad
- **Master Log**: Registro cronológico en `claude/master-log.md`
- **Tasks**: Gestión en `claude/tasks/task-tracker.md`
- **ADRs**: Decisiones en `claude/adr/ADR-XXX.md`
- **Commits**: Formato `[TASK-XXX] Descripción`
- **Docker Guide**: `claude/docs/docker-commands-guide.md`

## ⚠️ Consideraciones Especiales
- **No hardcoding** - Todo via variables de entorno
- **Graceful shutdown** - Cerrar conexiones properly
- **Backpressure** - Manejar sobrecarga de datos
- **Idempotencia** - Operaciones repetibles sin efectos
- **Observabilidad** - Logs, metrics, traces desde día 1
- **🚫 NO make** - Solo docker y docker-compose

## 🔧 Comandos de Desarrollo Actualizados

### Setup Inicial
```bash
cp .env.example .env
docker-compose --profile dev up -d
```

### Desarrollo Diario
```bash
# Ver estado
docker-compose ps

# Logs
docker-compose logs -f
docker-compose logs -f app

# Tests
docker-compose exec app python -m pytest -v

# Shell
docker-compose exec app bash

# MongoDB
docker-compose exec mongodb mongosh cloud_marketdata

# Redis
docker-compose exec redis redis-cli
```

### Health & Monitoring
```bash
# Health checks
curl http://localhost:8000/health
curl http://localhost:8000/ping

# Métricas
docker stats $(docker-compose ps -q)

# Configuración
docker-compose exec app python -c "from src.core.config import Settings; print(Settings().model_dump_json(indent=2))"
```

### Cleanup
```bash
# Parar servicios
docker-compose down

# Limpieza completa
docker-compose down -v
docker system prune -f
```

## 🎯 Principios de Subfases Atómicas
1. **Máximo 2h por subfase** - Completable en una sesión
2. **Criterio de completitud claro** - Verificable objetivamente
3. **Entregables específicos** - Lista concreta de outputs
4. **Estado funcional** - Proyecto ejecutable tras cada subfase
5. **Rollback seguro** - Fácil reversión si se interrumpe
6. **🐳 Docker-ready** - Todo verificable con comandos Docker

## 📊 Métricas Actuales
- **Total Subfases**: 16 (8 tareas → 16 subfases atómicas)
- **Completadas**: 1 (6.25%)
- **Horas Consumidas**: 1.5h
- **Horas Restantes**: 24.5h
- **Próxima**: TASK-001B FastMCP integration (1h)

## 🌟 Última Actualización: Docker-First
- ✅ Eliminado Makefile completamente
- ✅ Creado DOCKER_COMMANDS.md con guía completa
- ✅ Actualizada toda la documentación
- ✅ README.md con comandos Docker directos
- ✅ Guías de troubleshooting con Docker
- ✅ Task tracker actualizado sin make

## 🔗 Archivos de Referencia Clave
- `DOCKER_COMMANDS.md` - Comandos Docker principales
- `claude/docs/docker-commands-guide.md` - Guía completa Docker
- `claude/docs/arquitectura.md` - Diseño técnico
- `claude/docs/integracion-waickoff.md` - Integración MCP
- `claude/tasks/task-tracker.md` - Progreso detallado

---

**🐳 Recuerda: Solo comandos Docker, nada de make. Cada subfase debe ser completable y verificable con docker-compose.**

Adelante con la próxima subfase según disponibilidad.
