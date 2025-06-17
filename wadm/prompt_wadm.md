# PROMPT: WADM Development v1.0

## 🚀 Inicio Rápido
**Ubicación:** `D:\projects\mcp\wadm`

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
- MongoDB + Redis
- Docker + docker-compose
- WebSocket Bybit v5 + Binance

## 🎯 Estado Actual
- **v0.1.0** En Desarrollo
- **0 herramientas MCP** implementadas
- **Arquitectura**: Clean Architecture 4 capas
- **Próxima tarea**: TASK-001 Setup Docker

## 📋 Tareas Prioritarias
1. **TASK-001**: Setup Docker + FastAPI + MongoDB (3h)
2. **TASK-002**: WebSocket collectors (4h)
3. **TASK-003**: MongoDB schemas (3h)
4. **TASK-004**: Volume Profile service (4h)
5. **TASK-005**: Order Flow analyzer (4h)

Ver `claude/tasks/task-tracker.md` para lista completa.

## 💡 Información Crítica
- **Objetivo**: Sistema de recolección y distribución de indicadores de mercado
- **Puerto API**: 8920 (no estándar, evita conflictos con Plesk)
- **Limitaciones VPS**: Storage limitado, CPU compartida
- **Retención**: 1h raw data, 24h agregados 1m, 7d agregados 1h
- **Performance target**: < 10ms por trade, 10k trades/seg

## 🔧 Comandos Esenciales
```bash
# Desarrollo
docker-compose up -d
docker-compose logs -f
pytest -v

# Estado rápido
./quick-status.sh      # Linux/Mac
.\quick-status.ps1     # Windows

# Producción
docker build -t wadm .
docker run -d -p 8920:8920 wadm
```

## 📁 Estructura del Proyecto
```
wadm/
├── src/
│   ├── core/           # Entidades y lógica de dominio
│   ├── infrastructure/ # Adaptadores externos
│   ├── application/    # Casos de uso
│   └── presentation/   # API y MCP
├── tests/              # Tests con pytest
├── docker/             # Dockerfiles y configs
├── claude/             # Sistema de trazabilidad
│   ├── master-log.md   # Log principal
│   ├── tasks/          # Gestión de tareas
│   ├── adr/            # Decisiones arquitectónicas
│   ├── logs/           # Logs diarios
│   └── bugs/           # Bug tracking
└── docs/               # Documentación técnica
```

## 🏗️ Principios Arquitectónicos
1. **Clean Architecture** - Independencia de frameworks
2. **DDD** - Modelado rico del dominio (Volume Profile, Order Flow)
3. **SOLID** - Especialmente SRP y DIP
4. **Event-driven** - Comunicación vía eventos
5. **Fail-fast** - Errores tempranos y claros

## 🔍 Sistema de Trazabilidad
- **Master Log**: Registro cronológico en `claude/master-log.md`
- **Tasks**: Gestión en `claude/tasks/task-tracker.md`
- **ADRs**: Decisiones en `claude/adr/ADR-XXX.md`
- **Bugs**: Tracking en `claude/bugs/BUG-XXX.md`
- **Commits**: Formato `[TASK-XXX] Descripción`

## ⚠️ Consideraciones Especiales
- **No hardcoding** - Todo via variables de entorno
- **Graceful shutdown** - Cerrar conexiones properly
- **Backpressure** - Manejar sobrecarga de datos
- **Idempotencia** - Operaciones repetibles sin efectos
- **Observabilidad** - Logs, metrics, traces desde día 1
- **Integración wAIckoff** - Compatible con ecosistema existente

## 🎯 Indicadores Core
### Volume Profile
- POC (Point of Control)
- VAH/VAL (Value Area High/Low)
- Distribución por niveles de precio

### Order Flow
- Delta y Delta acumulativo
- Imbalance ratio
- Large trades detection
- Absorción detection

## 🔗 Integraciones
- **wAIckoff_reports**: Cache local de indicadores
- **waickoff_mcp**: Consumidor de datos procesados
- **Exchanges**: Bybit v5, Binance WebSocket

---
*WADM - wAIckoff Data Manager | Sistema profesional de datos de mercado*
