# 🏗️ Architecture Overview - wAIckoff MCP Server

Visión general de la arquitectura del sistema wAIckoff MCP, diseñado con Clean Architecture y principios SOLID.

## 📐 Arquitectura General

### Clean Architecture (4 Capas)

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │   MCP Adapter   │  │   REST API      │  │   CLI       │  │
│  │   (Claude)      │  │   (Future)      │  │   (Debug)   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                      Core Layer                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Market Analysis Engine                    │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │ │
│  │  │   SMC       │  │   Wyckoff   │  │   Technical     │ │ │
│  │  │   Analysis  │  │   Analysis  │  │   Indicators    │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────┐ │
│  │   Market    │  │  Analysis   │  │   Storage   │  │ ... │ │
│  │   Data      │  │   Services  │  │   Services  │  │     │ │
│  │   Service   │  │             │  │             │  │     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────┘ │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────┐ │
│  │   Bybit     │  │   File      │  │   Cache     │  │ ... │ │
│  │   API       │  │   System    │  │   Manager   │  │     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Componentes Principales

### 1. Presentation Layer

#### MCP Adapter
- **Archivo**: `src/adapters/mcp.ts`
- **Responsabilidad**: Interface con Claude Desktop
- **Funciones**:
  - Registro de herramientas MCP (106+)
  - Manejo de requests/responses
  - Validación de parámetros
  - Delegación a handlers especializados

#### Handlers Especializados
```typescript
src/adapters/handlers/
├── marketDataHandlers.ts          # Market data operations
├── smartMoneyConceptsHandlers.ts  # SMC analysis
├── wyckoffBasicHandlers.ts        # Wyckoff basic analysis
├── wyckoffAdvancedHandlers.ts     # Wyckoff advanced analysis
├── technicalAnalysisHandlers.ts   # Technical indicators
├── multiExchangeHandlers.ts       # Multi-exchange operations
├── analysisRepositoryHandlers.ts  # Data persistence
├── reportGeneratorHandlers.ts     # Report generation
├── configurationHandlers.ts       # User configuration
├── systemConfigurationHandlers.ts # System configuration
└── contextHandlers.ts             # Context management
```

### 2. Core Layer

#### Market Analysis Engine
- **Archivo**: `src/core/engine.ts`
- **Responsabilidad**: Orquestador central del sistema
- **Características**:
  - Dependency Injection para servicios
  - Performance monitoring integrado
  - Error handling centralizado
  - Configuración unificada

#### Core Types
- **Archivo**: `src/types/index.ts`
- **Contenido**: 
  - Interfaces centralizadas (1000+ tipos)
  - Tipos para SMC, Wyckoff, Technical Analysis
  - Configuraciones y respuestas
  - Modelos de datos

### 3. Service Layer

#### Smart Money Concepts Services
```typescript
src/services/smartMoney/
├── orderBlocks.ts              # Order Blocks detection
├── fairValueGaps.ts           # Fair Value Gaps analysis
├── breakOfStructure.ts        # Break of Structure detection
├── smartMoneyAnalysis.ts      # SMC integration & confluences
└── smartMoneyDashboard.ts     # SMC dashboard & trading setups
```

#### Wyckoff Analysis Services
```typescript
src/services/
├── wyckoffBasic.ts            # Basic Wyckoff analysis (7 tools)
└── wyckoffAdvanced.ts         # Advanced Wyckoff analysis (7 tools)
```

#### Technical Analysis Services
```typescript
src/services/
├── fibonacci.ts               # Fibonacci levels with validation
├── bollingerBands.ts         # Bollinger Bands analysis
├── elliottWave.ts            # Elliott Wave detection
└── technicalAnalysis.ts      # Technical confluences
```

#### Multi-Exchange Services
```typescript
src/services/multiExchange/
├── index.ts                                    # Main aggregator
└── advancedMultiExchangeService.ts            # Advanced features
```

#### Core Services
```typescript
src/services/
├── marketData.ts              # Bybit API integration
├── analysis.ts                # Technical analysis core
├── trading.ts                 # Grid trading suggestions
├── storage.ts                 # File system operations
├── cacheManager.ts            # Memory cache
├── historicalData.ts          # Historical data fetching
├── historicalAnalysis.ts      # Historical analysis
├── trapDetection.ts           # Bull/bear trap detection
└── reports/reportGenerator.ts  # Report generation
```

### 4. Infrastructure Layer

#### External APIs
- **Bybit API v5**: Market data, orderbook, klines
- **Rate Limiting**: Implementado en todas las conexiones
- **Retry Logic**: 3 reintentos con backoff exponencial

#### Storage Systems
- **File System**: Storage principal en `./storage/`
- **MongoDB**: Opcional para hybrid storage
- **Cache**: Memory cache para performance

#### Utilities
```typescript
src/utils/
├── logger.ts                  # Advanced logging system
├── fileLogger.ts             # File-based logging
├── performance.ts            # Performance monitoring
├── timezone.ts               # Timezone management
├── requestLogger.ts          # API request logging
└── errorHandling.ts          # Error handling utilities
```

## 🔄 Data Flow

### Request Flow
```
Claude Desktop
    │
    ▼
MCP Adapter (mcp.ts)
    │
    ▼
Specialized Handler
    │
    ▼
Market Analysis Engine
    │
    ▼
Service Layer (Business Logic)
    │
    ▼
Infrastructure (APIs, Storage)
    │
    ▼
Response Processing
    │
    ▼
Formatted JSON Response
    │
    ▼
Claude Desktop Display
```

### Error Handling Flow
```
Service Exception
    │
    ▼
Retry Logic (if network error)
    │
    ▼ (if still fails)
Fallback Methods (4 levels)
    │
    ▼ (if all fail)
Graceful Degradation
    │
    ▼
Logged Error + Safe Response
    │
    ▼
User-Friendly Error Message
```

## 📊 Design Patterns

### 1. Dependency Injection
```typescript
// Engine recibe servicios como dependencias
constructor(
  config?: Partial<SystemConfig>,
  marketDataService?: IMarketDataService,
  analysisService?: IAnalysisService,
  // ... otros servicios
)
```

### 2. Factory Pattern
```typescript
// Para crear diferentes tipos de handlers
export const createMultiExchangeHandlers = (engine: MarketAnalysisEngine) => {
  return [
    getAggregatedTickerHandler,
    getCompositeOrderbookHandler,
    // ...
  ];
};
```

### 3. Strategy Pattern
```typescript
// Para diferentes estrategias de análisis
interface IAnalysisStrategy {
  analyze(symbol: string, options: any): Promise<any>;
}

class SMCStrategy implements IAnalysisStrategy { ... }
class WyckoffStrategy implements IAnalysisStrategy { ... }
```

### 4. Observer Pattern
```typescript
// Para performance monitoring
class PerformanceMonitor {
  async measure<T>(name: string, operation: () => Promise<T>): Promise<T>
}
```

### 5. Builder Pattern
```typescript
// Para configuración compleja
class ConfigurationBuilder {
  withTimezone(tz: string): ConfigurationBuilder
  withAnalysisParams(params: any): ConfigurationBuilder
  build(): SystemConfig
}
```

## 🛡️ Reliability Features

### 1. Retry Logic System
- **Implementación**: Todas las conexiones externas
- **Configuración**: 3 reintentos con backoff exponencial
- **Scope**: Market data, analysis services, storage operations

### 2. Multi-Layer Fallbacks
- **Level 1**: Método principal con parámetros optimizados
- **Level 2**: Criterios relajados para datos limitados
- **Level 3**: Métodos alternativos de detección
- **Level 4**: Last resort con datos mínimos

### 3. Graceful Degradation
- **Partial Failures**: Sistema continúa funcionando
- **Safe Defaults**: Valores seguros cuando falta data
- **User Communication**: Mensajes informativos sobre limitaciones

### 4. Data Validation
- **Input Validation**: Todos los parámetros validados
- **Output Validation**: Resultados verificados antes de retornar
- **Type Safety**: TypeScript strict mode

## 🔧 Configuration Management

### User Configuration
```typescript
interface UserConfig {
  timezone: UserTimezoneConfig;
  trading: UserTradingConfig;
  display: UserDisplayConfig;
}
```

### System Configuration
```typescript
interface SystemConfig {
  api: ApiConfig;
  analysis: AnalysisConfig;
  grid: GridConfig;
  logging: LoggingConfig;
}
```

### Environment Configuration
```typescript
// .env file con configuraciones sensibles
BYBIT_API_URL=https://api.bybit.com
NODE_ENV=production
LOG_LEVEL=info
```

## 📈 Scalability Considerations

### Horizontal Scaling
- **Stateless Services**: Todos los servicios son stateless
- **Cache Strategy**: Cache distribuido para múltiples instancias
- **Load Balancing**: Ready para load balancers

### Vertical Scaling
- **Memory Management**: Cache con limits y TTL
- **CPU Optimization**: Async operations y performance monitoring
- **I/O Optimization**: Batch operations y connection pooling

### Performance Optimization
- **Caching**: Multi-level cache (memory + persistent)
- **Lazy Loading**: Servicios cargados bajo demanda
- **Resource Pooling**: Connection pooling para APIs
- **Compression**: Context compression para storage

## 🔮 Future Architecture

### Planned Enhancements
1. **Microservices**: Separación en microservicios independientes
2. **Event Sourcing**: Para mejor auditabilidad
3. **CQRS**: Separación de commands y queries
4. **Message Queues**: Para operaciones asíncronas pesadas

### Integration Points
1. **AI/ML Services**: Para predicciones avanzadas
2. **Real-time Data**: WebSocket connections
3. **Notification Systems**: Alerts y notificaciones
4. **External Analytics**: Integración con plataformas de análisis

---

*Arquitectura diseñada para máxima confiabilidad, extensibilidad y performance en análisis de mercados financieros.*
