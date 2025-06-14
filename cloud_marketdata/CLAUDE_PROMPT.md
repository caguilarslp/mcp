# PROMPT: Cloud MarketData Development v1.0

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

### Stack Tecnológico
- Python 3.12-slim + FastAPI + Pydantic v2
- FastMCP (estándar MCP)
- MongoDB + Redis + Celery
- Docker + docker-compose
- WebSocket Bybit v5 + Binance

## 🎯 Estado Actual
- **v0.1.0** En Diseño
- **0 herramientas MCP** implementadas
- **Arquitectura**: Clean Architecture 4 capas
- **Próxima tarea**: TASK-001 Setup Docker

## 📋 Tareas Prioritarias
1. **TASK-001**: Setup Docker + FastAPI + FastMCP (2h)
2. **TASK-002**: WebSocket collectors (4h)
3. **TASK-003**: MongoDB schemas (3h)
4. **TASK-004**: Volume Profile service (4h)
5. **TASK-005**: Order Flow analyzer (4h)

Ver `claude/tasks/task-tracker.md` para lista completa.

## 💡 Información Crítica
- **Objetivo**: Microservicio 24/7 para datos de mercado
- **Limitaciones VPS**: Storage limitado, CPU compartida
- **Retención**: 1h raw data, 24h agregados 1m, 7d agregados 1h
- **Performance target**: < 10ms por trade, 10k trades/seg

## 🔧 Comandos Esenciales
```bash
# Desarrollo
docker-compose up -d
docker-compose logs -f
pytest -v

# Producción
docker build -t cloud-marketdata .
docker run -d cloud-marketdata
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
└── claude/            # Documentación
```

## 🏗️ Principios Arquitectónicos
1. **Clean Architecture** - Independencia de frameworks
2. **DDD** - Modelado rico del dominio
3. **SOLID** - Especialmente SRP y DIP
4. **Event-driven** - Comunicación vía eventos
5. **Fail-fast** - Errores tempranos y claros

## 🔍 Sistema de Trazabilidad
- **Master Log**: Registro cronológico en `claude/master-log.md`
- **Tasks**: Gestión en `claude/tasks/task-tracker.md`
- **ADRs**: Decisiones en `claude/adr/ADR-XXX.md`
- **Commits**: Formato `[TASK-XXX] Descripción`

## ⚠️ Consideraciones Especiales
- **No hardcoding** - Todo via variables de entorno
- **Graceful shutdown** - Cerrar conexiones properly
- **Backpressure** - Manejar sobrecarga de datos
- **Idempotencia** - Operaciones repetibles sin efectos
- **Observabilidad** - Logs, metrics, traces desde día 1

---

*Este prompt debe añadirse a Claude al trabajar en el proyecto*
