# Documentación Técnica WADM

## 📋 Índice de Documentación

### 🏗️ Arquitectura
- **[arquitectura-simplificada.md](arquitectura-simplificada.md)** - Diseño general del sistema
- **[mongodb-schemas.md](mongodb-schemas.md)** - Schemas de base de datos y arquitectura de datos
- **[deployment-vps.md](deployment-vps.md)** - Guía de deployment en VPS

### 🔧 API y Integración
- **[api-reference.md](api-reference.md)** - Referencia completa de la API REST con Volume Profile endpoints
- **[mcp-integration.md](mcp-integration.md)** - Integración con protocolo MCP (próximamente)

### 📊 Indicadores y Análisis
- **[volume-profile-service.md](volume-profile-service.md)** - ✅ **Volume Profile Service completo** - Algoritmos POC/VAH/VAL, cache, API, tests
- **[order-flow.md](order-flow.md)** - Análisis de Order Flow (próximamente - TASK-005)
- **[market-structure.md](market-structure.md)** - Detección de estructura de mercado (próximamente)

### 🔌 Conectores
- **[websocket-collectors.md](websocket-collectors.md)** - Documentación de collectors WebSocket (próximamente)
- **[exchange-apis.md](exchange-apis.md)** - Integración con APIs de exchanges (próximamente)

## 📈 Estado de Documentación

| Documento | Estado | Última Actualización | Tarea |
|-----------|--------|---------------------|-------|
| arquitectura-simplificada.md | ✅ Completo | 17/06/2025 | TASK-001 |
| mongodb-schemas.md | ✅ Completo | 17/06/2025 | TASK-003 |
| deployment-vps.md | ✅ Completo | 17/06/2025 | TASK-001 |
| api-reference.md | ✅ Actualizado | 17/06/2025 21:15 | TASK-004 |
| **volume-profile-service.md** | ✅ **Nuevo** | **17/06/2025 21:15** | **TASK-004** |
| websocket-collectors.md | 🔄 Pendiente | - | TASK-002 |
| mcp-integration.md | 🔄 Pendiente | - | TASK-006 |
| order-flow.md | 🔄 Pendiente | - | TASK-005 |
| market-structure.md | 🔄 Pendiente | - | TASK-005 |
| exchange-apis.md | 🔄 Pendiente | - | Futuro |

## 🎯 Tareas Completadas

### TASK-001: Setup Docker + FastAPI + MongoDB ✅
- Infraestructura base establecida
- Docker Compose para desarrollo y producción
- Sistema de testing implementado

### TASK-002: Sistema de WebSocket Collectors ✅  
- Collectors para Bybit v5 y Binance
- Auto-reconexión y health monitoring
- Gestión unificada con CollectorManager

### TASK-003: Schemas MongoDB y Modelos de Datos ✅
- 7 colecciones con índices optimizados
- TTL automático por tipo de dato
- Sistema de repositorios con patrón Repository
- Modelos Pydantic v2 para API
- DataManager para coordinación

### TASK-004: Volume Profile Service ✅ **COMPLETADO**
- **VolumeProfileCalculator**: Algoritmos POC/VAH/VAL con precisión Decimal
- **VolumeProfileService**: Multi-timeframe (5m-1d), real-time, histórico
- **Use Cases**: Clean Architecture con CalculateVolumeProfile, RealTime, Historical
- **Redis Cache**: Extendido con TTL estratificado (1min-10min según uso)
- **API REST**: 6 endpoints especializados con validación Pydantic v2
- **Testing**: 25+ test cases con cobertura completa de algoritmos core
- **Documentation**: Technical specs, ejemplos prácticos, ADR-003

## 🚀 Próximas Documentaciones

### TASK-005: Order Flow Analyzer (Próximo)
- Clasificación buy/sell automática
- Cálculo de delta y delta acumulativo
- Detección de absorción e imbalances
- WebSocket streaming para updates

### TASK-006: FastMCP Tools Implementation
- Herramientas MCP para wAIckoff integration
- get_volume_profile, get_order_flow tools
- Documentación de integración completa
- Ejemplos de uso con waickoff_mcp

### Futuras Extensiones
- **Websocket Collectors Documentation**: Specs técnicas collectors
- **Multi-Exchange Support**: Aggregated volume profiles
- **Machine Learning Integration**: POC prediction patterns
- **Advanced Analytics**: Volume profile overlays

## 📊 Volume Profile Service Highlights

### Core Features Implementadas
- **POC (Point of Control)**: Precio con mayor volumen ejecutado
- **VAH/VAL (Value Area)**: Límites del 70% de volumen centrado en POC
- **Multi-timeframe**: 5m, 15m, 30m, 1h, 4h, 1d support
- **Tick Size Automático**: BTC/ETH: 0.01, USDT: 0.001, otros: 0.0001
- **Cache Inteligente**: TTL optimizado por patrón de uso
- **Trading Insights**: Niveles automáticos soporte/resistencia

### API Endpoints Disponibles
1. `GET /volume-profile/current/{symbol}` - Profile tiempo real
2. `GET /volume-profile/historical/{symbol}` - Histórico resumido  
3. `GET /volume-profile/calculate/{symbol}` - Cálculo personalizado
4. `GET /volume-profile/symbols` - Símbolos disponibles
5. `GET /volume-profile/poc-levels/{symbol}` - Niveles POC históricos
6. `GET /volume-profile/statistics/{symbol}` - Estadísticas avanzadas

### Architecture Decision Record
- **[ADR-003: Volume Profile Service](../adr/ADR-003-volume-profile-service.md)** - Decisiones técnicas y trade-offs

---

**Progreso**: 50% del proyecto completado (4/8 tareas) 🎯

**Próximo**: TASK-005 Order Flow Analyzer para completar indicadores core

**Mantenimiento**: Esta documentación se actualiza automáticamente con cada tarea completada.

**Contacto**: Documentación generada por el sistema de trazabilidad WADM.
