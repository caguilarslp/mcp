# 🎯 TASK-002A: WebSocket Collector Base + Bybit Trades - Verification Guide

## ✅ Implementación Completada

### 📦 Entregables TASK-002A
- [x] **Abstract WebSocketCollector base class** - Patrón template implementado
- [x] **BybitTradesCollector implementation** - Collector funcional completo
- [x] **Basic reconnection logic** - Exponential backoff + circuit breaker
- [x] **Trade entity model (Pydantic)** - Modelo tipado y validado
- [x] **Simple in-memory storage para tests** - Almacenamiento con estadísticas

## 🏗️ Arquitectura Implementada

### 📁 Nueva Estructura
```
src/
├── entities/
│   ├── __init__.py          # Exports Trade, TradeSide
│   └── trade.py             # Trade Pydantic model con validación
├── collectors/
│   ├── __init__.py          # Exports WebSocketCollector, CollectorStatus
│   ├── base.py              # Abstract WebSocketCollector base class
│   ├── manager.py           # CollectorManager para gestión centralizada
│   ├── bybit/
│   │   ├── __init__.py      # Exports BybitTradesCollector
│   │   └── trades.py        # BybitTradesCollector implementation
│   └── storage/
│       ├── __init__.py      # Exports InMemoryStorage
│       └── memory.py        # InMemoryStorage implementation
└── main.py                  # Integración con FastAPI + lifespan
```

## 🔧 Comandos de Verificación

### 1. Setup y Inicio
```bash
# Asegurar que .env existe
cp .env.example .env

# Construir e iniciar servicios
docker-compose --profile dev up --build -d

# Verificar que todos los servicios están UP
docker-compose ps
```

### 2. Health Check - Debe mostrar collector_manager "healthy"
```bash
curl http://localhost:8000/health
# Expected: services.collector_manager: "healthy", collectors: "1/1 active"
```

### 3. Verificar Status de Collectors
```bash
# Status general de todos los collectors
curl http://localhost:8000/collectors/status

# Status específico del collector Bybit
curl http://localhost:8000/collectors/status/bybit_trades
```

### 4. Verificar Recopilación de Trades
```bash
# Ver estadísticas de storage
curl http://localhost:8000/collectors/storage/stats

# Ver últimos 5 trades recibidos
curl "http://localhost:8000/collectors/trades?limit=5"

# Ver trades específicos de BTCUSDT
curl "http://localhost:8000/collectors/trades?symbol=BTCUSDT&limit=10"
```

### 5. Monitoreo de Logs en Tiempo Real
```bash
# Ver logs del contenedor principal
docker-compose logs -f app

# Filtrar logs de collectors específicamente
docker-compose logs -f app | grep -i "collector\|trade"
```

## 🎯 Criterio de Completitud: "Recibe trades de BTCUSDT por 5 minutos sin crash"

### ✅ Verificación de Éxito
1. **Conexión WebSocket**: Logs muestran "Connected to Bybit WebSocket API v5"
2. **Suscripción**: Logs muestran "Subscribed to Bybit trade topics: ['publicTrade.BTCUSDT']"
3. **Trades fluyendo**: `/collectors/trades` retorna trades recientes
4. **Sin crashes**: Aplicación sigue respondiendo después de 5+ minutos
5. **Health checks**: `/health` reporta collector_manager como "healthy"

### 📊 Métricas Esperadas (después de 5 minutos)
```bash
curl http://localhost:8000/collectors/storage/stats
```
**Esperado:**
- `total_trades_received` > 50 (Bybit BTCUSDT es muy activo)
- `trades_per_second` > 0.1
- `symbols_tracked` contiene ["BTCUSDT"]
- `current_trades_stored` > 0

## 🐛 Troubleshooting

### Problema: Collector no se conecta
```bash
# Verificar conectividad a Bybit
docker-compose exec app ping stream.bybit.com

# Ver logs detallados de conexión
docker-compose logs -f app | grep -i "websocket\|bybit\|connect"
```

### Problema: No llegan trades
```bash
# Verificar suscripción exitosa
docker-compose logs -f app | grep -i "subscrib"

# Verificar que el WebSocket está activo
curl http://localhost:8000/collectors/status/bybit_trades
# Verificar que status sea "active" y is_healthy sea true
```

### Problema: Aplicación se crashea
```bash
# Ver últimos logs de error
docker-compose logs --tail=50 app | grep -i "error\|exception\|traceback"

# Reiniciar solo el contenedor de app
docker-compose restart app
```

## 🔄 Testing Manual

### Test 1: Reconnection Logic
```bash
# Verificar estado inicial
curl http://localhost:8000/collectors/status/bybit_trades

# Simular interrupción de red (dentro del contenedor)
docker-compose exec app pkill -f "python"

# Esperar restart automático y verificar reconexión
# (Docker restart policy debe reiniciar el contenedor)
sleep 30
curl http://localhost:8000/collectors/status/bybit_trades
```

### Test 2: Data Validation
```bash
# Obtener un trade y verificar estructura
curl "http://localhost:8000/collectors/trades?limit=1" | jq '.'

# Verificar campos requeridos:
# - symbol: "BTCUSDT"
# - side: "Buy" or "Sell"  
# - price: string con número válido
# - quantity: string con número válido
# - timestamp: ISO format
# - exchange: "bybit"
# - trade_id: string no vacía
```

### Test 3: Performance bajo Carga
```bash
# Monitorear durante 5 minutos
watch -n 10 'curl -s http://localhost:8000/collectors/storage/stats | jq ".trades_per_second, .current_trades_stored"'

# Verificar que trades_per_second sea consistente
# Verificar que memory usage no crezca indefinidamente
```

## 📈 Métricas de Éxito TASK-002A

- ✅ **Architectural**: Base WebSocketCollector reutilizable implementado
- ✅ **Functional**: Bybit trades collector funcionando 5+ minutos sin crash  
- ✅ **Data**: Trades válidos almacenados con validación Pydantic
- ✅ **Resilience**: Reconnection logic con exponential backoff
- ✅ **Observability**: Health checks, stats, logging estructurado
- ✅ **Integration**: FastAPI lifecycle management + HTTP endpoints

## ⏭️ Preparación para TASK-002B
- Base WebSocketCollector probada y estable
- Storage system funcionando
- Manager pattern establecido
- Health monitoring operativo
- Logging y observabilidad completos

**¿Sistema listo para expansión con más collectors?** ✅
