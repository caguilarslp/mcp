# 📋 WADM - Sistema de Tareas

## 🎯 Fases del Proyecto

### FASE 1: Infraestructura Base (Semana 1)
- [ ] **TASK-001**: Configurar estructura Docker
  - Docker Compose con MongoDB
  - Redes internas Docker
  - Volúmenes persistentes
  
- [ ] **TASK-002**: MongoDB Schema Design
  - Colección volume_profile
  - Colección order_flow
  - Índices optimizados
  - TTL para limpieza automática

- [ ] **TASK-003**: Collectors Base
  - Clase base AbstractCollector
  - Manejo de reconexión WebSocket
  - Sistema de logging
  - Health checks

### FASE 2: Recolección de Datos (Semana 2)
- [ ] **TASK-004**: Binance Collector
  - WebSocket trades
  - Procesamiento de mensajes
  - Buffer temporal
  - Tests unitarios

- [ ] **TASK-005**: Bybit Collector
  - WebSocket publicTrade
  - Procesamiento de mensajes
  - Buffer temporal
  - Tests unitarios

- [ ] **TASK-006**: Data Processor
  - Cálculo Volume Profile (POC, VAH, VAL)
  - Cálculo Order Flow (Delta, Imbalance)
  - Agregación por timeframes
  - Limpieza de datos antiguos

### FASE 3: MCP Server (Semana 3)
- [ ] **TASK-007**: MCP Server Base
  - Estructura modular
  - Autenticación API Key
  - Rate limiting
  - CORS configuration

- [ ] **TASK-008**: Endpoints de Indicadores
  - GET /volume_profile/{symbol}
  - GET /order_flow/{symbol}
  - GET /indicators/summary/{symbol}
  - Respuestas optimizadas

- [ ] **TASK-009**: Seguridad y SSL
  - Configurar Nginx reverse proxy
  - Let's Encrypt SSL
  - Firewall rules
  - API Key management

### FASE 4: MCP Client (Semana 4)
- [ ] **TASK-010**: MCP Client Base
  - Polling configurable
  - Retry logic
  - Cache management
  - Error handling

- [ ] **TASK-011**: Storage Local
  - Estructura de carpetas
  - Rotación de archivos
  - Compresión opcional
  - Limpieza automática

- [ ] **TASK-012**: Integración wAIckoff
  - Nuevas herramientas MCP
  - Handlers para indicadores
  - Tests de integración
  - Documentación

### FASE 5: Testing y Deployment (Semana 5)
- [ ] **TASK-013**: Testing End-to-End
  - Tests de carga
  - Tests de reconexión
  - Tests de seguridad
  - Validación de datos

- [ ] **TASK-014**: Deployment VPS
  - Scripts de instalación
  - Configuración Supervisor
  - Monitoreo con Grafana
  - Alertas

- [ ] **TASK-015**: Documentación
  - API Documentation
  - Guía de instalación
  - Guía de uso
  - Troubleshooting

## 📊 Tareas Técnicas Detalladas

### TASK-001: Configurar estructura Docker
**Prioridad**: Alta  
**Estimación**: 4h  
**Dependencias**: Ninguna  

**Subtareas**:
1. Crear docker-compose.yml base
2. Configurar red interna `wadm-network`
3. Definir servicio MongoDB con autenticación
4. Configurar volúmenes para persistencia
5. Añadir health checks

**Entregables**:
- `docker/docker-compose.yml`
- `docker/.env.example`
- Scripts de inicio/parada

---

### TASK-002: MongoDB Schema Design
**Prioridad**: Alta  
**Estimación**: 2h  
**Dependencias**: TASK-001  

**Subtareas**:
1. Diseñar schema volume_profile
2. Diseñar schema order_flow
3. Crear índices compuestos (symbol, timestamp)
4. Configurar TTL indexes
5. Script de inicialización

**Entregables**:
- `docker/mongo/init.js`
- Documentación de schemas

---

### TASK-004: Binance Collector
**Prioridad**: Alta  
**Estimación**: 6h  
**Dependencias**: TASK-003  

**Subtareas**:
1. Implementar BinanceCollector class
2. Parseo de mensajes trade
3. Sistema de reconexión automática
4. Metrics collection
5. Tests con datos mock

**Entregables**:
- `src/collectors/binance/collector.py`
- `tests/test_binance_collector.py`

## 🎯 Criterios de Éxito

1. **Confiabilidad**: 99.9% uptime en recolección
2. **Latencia**: < 100ms procesamiento por trade
3. **Almacenamiento**: < 1GB/día para 10 símbolos
4. **API Response**: < 50ms para queries
5. **Seguridad**: 0 vulnerabilidades críticas

## 📅 Timeline

- **Semana 1-2**: Infraestructura y Recolección
- **Semana 3-4**: API y Cliente
- **Semana 5**: Testing y Deploy
- **Semana 6**: Monitoreo y Optimización

## 🚦 Estados de Tareas

- ⬜ No iniciada
- 🟨 En progreso
- ✅ Completada
- ❌ Bloqueada
- 🔄 En revisión

---

*Última actualización: 15/06/2025*
