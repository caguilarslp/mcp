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
4. **KISS principle** - Simple primero, complejo después
5. **Async by default** - Todo I/O debe ser asíncrono
6. **Logs claros** - INFO level por defecto

### Stack Tecnológico
- Python 3.12 + asyncio + websockets
- MongoDB (storage)
- FastAPI (próximamente)
- TradingView Lightweight Charts + Plotly.js (visualización futura)
- LLM Multi-router (Claude, GPT-4, Gemini, Llama local)

## 🎯 Estado Actual
- **v0.1.0** En Desarrollo
- **Trades recolectándose** correctamente (1400+)
- **Indicadores NO calculando** - Bug a resolver (TASK-001)
- **Próxima tarea**: Fix indicator calculations

## 📋 Tareas Prioritarias
1. **TASK-001**: Debug indicator calculations (CRÍTICO)
2. **TASK-002**: Volume Profile Enhancement (3h)
3. **TASK-003**: Order Flow Analysis (4h)
4. **TASK-004**: VWAP Implementation (2h)
5. **TASK-005**: Market Structure Analysis (5h)

Ver `claude/tasks/task-tracker.md` para lista completa (21 tareas).

## 💡 Información Crítica
- **Objetivo**: Sistema Smart Money de análisis institucional
- **Filosofía**: Detectar actividad de grandes jugadores (Wyckoff)
- **Storage**: Estrategia tiered para optimizar espacio
- **Indicadores**: 12 planeados basados en Smart Money Concepts
- **LLM Integration**: Multi-router para análisis contextual

## 🔧 Comandos Esenciales
```bash
# Desarrollo
python main.py              # Ejecutar colectores
python check_status.py      # Ver estado del sistema

# MongoDB (si usas Docker)
docker run -d -p 27017:27017 --name wadm-mongo \
  -e MONGO_INITDB_ROOT_USERNAME=wadm \
  -e MONGO_INITDB_ROOT_PASSWORD=wadm_secure_pass \
  mongo:latest
```

## 📁 Estructura del Proyecto
```
wadm/
├── src/
│   ├── collectors/     # Bybit & Binance WebSocket
│   ├── indicators/     # Volume Profile, Order Flow, etc.
│   ├── models/        # Trade, OrderBook, indicadores
│   ├── storage/       # MongoDB manager
│   ├── config.py      # Configuración central
│   └── manager.py     # Coordinador principal
├── claude/            # Sistema de trazabilidad
│   ├── master-log.md  # Log de desarrollo
│   ├── tasks/         # 21 tareas definidas
│   ├── adr/           # 3 decisiones arquitectónicas
│   └── bugs/          # Tracking de bugs
├── docs/              # Especificaciones técnicas
├── logs/              # Logs de aplicación
└── main.py           # Entry point
```

## 🏗️ Decisiones Arquitectónicas
1. **ADR-001**: Tiered Storage Strategy (hot/warm/cold/archive)
2. **ADR-002**: Visualization con TradingView + Plotly
3. **ADR-003**: Multi-LLM Router para análisis

## 🔍 Sistema de Trazabilidad
- **Master Log**: Registro cronológico en `claude/master-log.md`
- **Tasks**: 21 tareas en `claude/tasks/task-tracker.md`
- **ADRs**: Decisiones en `claude/adr/ADR-XXX.md`
- **Bugs**: Tracking en `claude/bugs/BUG-XXX.md`

## ⚠️ Issues Actuales
- **Indicadores no calculan** - MongoDB query o lógica de tiempo
- **Necesita debugging** - TASK-001 es crítica

## 🎯 Indicadores Planeados
### Fase 1 (Alta Prioridad)
- Volume Profile mejorado (TPO, VA dinámica)
- Order Flow avanzado (exhaustion, momentum)
- VWAP con bandas y anclado
- Market Structure (Wyckoff phases)

### Fase 2 (Media Prioridad)
- Liquidity Map (HVN/LVN, order blocks)
- Smart Money Footprint (icebergs, VSA)
- Time-Based Volume (CVD, relative volume)
- Delta Divergence Analysis

### Fase 3 (Baja Prioridad)
- Footprint Charts (bid/ask imbalances)
- Market Profile Letters (TPO)
- Composite Indicators

## 🔗 Integraciones Futuras
- **FastAPI**: Para servir indicadores
- **Dashboard Web**: TradingView charts + indicadores custom
- **LLM Analysis**: Alertas y reportes en lenguaje natural
- **Docker**: Una vez estable

---
*WADM - wAIckoff Data Manager | Smart Money Analysis System*