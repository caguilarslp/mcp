# 🏗️ WADM - Arquitectura del Sistema

## 📊 Diagrama General

```
┌─────────────────────────────────────────────────────────────┐
│                         VPS (Docker Host)                    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  Docker Network: wadm-net            │    │
│  │                                                      │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │    │
│  │  │  Binance    │  │   Bybit     │  │  MongoDB   │  │    │
│  │  │  Collector  │  │  Collector  │  │  (Internal)│  │    │
│  │  │  :8001      │  │  :8002      │  │  :27017    │  │    │
│  │  └──────┬──────┘  └──────┬──────┘  └─────▲──────┘  │    │
│  │         │                 │               │         │    │
│  │         └────────┬────────┘               │         │    │
│  │                  ▼                        │         │    │
│  │         ┌─────────────────┐               │         │    │
│  │         │ Data Processor  │───────────────┘         │    │
│  │         │    :8003        │                         │    │
│  │         └────────┬────────┘                         │    │
│  │                  ▼                                  │    │
│  │         ┌─────────────────┐                         │    │
│  │         │  MCP Server     │                         │    │
│  │         │    :8080        │                         │    │
│  │         └─────────────────┘                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                         │                                    │
│  ┌─────────────────────┼─────────────────────────────────┐  │
│  │        Nginx        │         (Reverse Proxy)         │  │
│  │         :443        ▼              :80                │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTPS
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                     Internet                                  │
└──────────────────────────┬───────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼──────┐    ┌────▼──────┐    ┌────▼──────┐
    │  PC #1    │    │  PC #2    │    │  PC #3    │
    │ MCP Client│    │ MCP Client│    │ MCP Client│
    └───────────┘    └───────────┘    └───────────┘
```

## 🔧 Componentes

### 1. **Collectors (Binance & Bybit)**
- **Función**: Conectar a WebSocket y recibir trades
- **Tecnología**: Python 3.11 + websocket-client
- **Características**:
  - Reconexión automática
  - Buffer en memoria (1000 trades)
  - Health check endpoint
  - Métricas de performance

### 2. **Data Processor**
- **Función**: Calcular indicadores desde trades raw
- **Tecnología**: Python + pandas/numpy
- **Procesamiento**:
  - Volume Profile: POC, VAH, VAL cada minuto
  - Order Flow: Delta, imbalance cada 5-30 segundos
  - Limpieza de datos antiguos (TTL)

### 3. **MongoDB**
- **Función**: Almacenar indicadores procesados
- **Configuración**:
  - ReplicaSet para consistencia
  - Auth habilitada
  - Índices optimizados para queries temporales
  - TTL automático por colección

### 4. **MCP Server**
- **Función**: API para distribuir indicadores
- **Tecnología**: TypeScript + MCP SDK
- **Endpoints**:
  - `/volume_profile/{symbol}?timeframe=1h`
  - `/order_flow/{symbol}?period=5m`
  - `/health`
  - `/metrics`

### 5. **Nginx**
- **Función**: Reverse proxy + SSL termination
- **Características**:
  - Let's Encrypt SSL
  - Rate limiting
  - CORS headers
  - Gzip compression

### 6. **MCP Client**
- **Función**: Consumir datos y cachear localmente
- **Tecnología**: TypeScript
- **Features**:
  - Polling configurable
  - Retry con backoff
  - Cache local en JSON
  - Integración con wAIckoff

## 🔐 Seguridad

### Capas de Seguridad:
1. **Red**: 
   - Firewall: Solo 443/80 público
   - Docker network aislada

2. **Aplicación**:
   - API Keys con hash bcrypt
   - Rate limiting: 60 req/min
   - Validación de inputs

3. **Datos**:
   - MongoDB auth obligatoria
   - Conexiones encriptadas (TLS)
   - No se exponen datos raw

## 📊 Flujo de Datos

```
1. Trade Event (Exchange)
       ↓
2. WebSocket Message
       ↓
3. Collector Buffer
       ↓
4. Data Processor
       ↓
5. MongoDB Storage
       ↓
6. MCP Server Cache
       ↓
7. HTTPS Response
       ↓
8. MCP Client
       ↓
9. Local JSON File
```

## 🎯 Decisiones Clave

1. **No almacenar trades raw**: Solo indicadores
2. **Procesamiento en el edge**: Cálculos en VPS
3. **Cache agresivo**: Reducir carga MongoDB
4. **Timeframes fijos**: No cálculo dinámico

## 📈 Escalabilidad

### Límites Actuales:
- 10 símbolos simultáneos
- 1000 trades/segundo total
- 100 clientes concurrentes
- 1GB RAM por servicio

### Puntos de Escalado:
1. Horizontal: Más collectors
2. Vertical: Más RAM para MongoDB
3. Cache: Redis para MCP Server
4. CDN: Para datos históricos

---

*Última actualización: 15/06/2025*
