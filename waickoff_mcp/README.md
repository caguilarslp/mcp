# 🤖 wAIckoff MCP Server v1.6.5

> **Servidor MCP avanzado para análisis de mercado crypto con integración Bybit**
> 
> Sistema modular de análisis técnico diseñado para alimentar **Waickoff AI** con datos precisos y contexto histórico para decisiones de trading inteligentes.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Protocol-blue)](https://modelcontextprotocol.io/)
[![Bybit](https://img.shields.io/badge/Bybit-API-orange)](https://bybit.com/)
[![Tests](https://img.shields.io/badge/Tests-100%2B-brightgreen)](#-sistema-de-testing)
[![SMC](https://img.shields.io/badge/Smart%20Money-60%25-brightgreen)](#-smart-money-concepts-nuevo)

---

## 🎯 **¿Qué es wAIckoff MCP?**

**wAIckoff MCP v1.6.5** es un servidor de **Model Context Protocol (MCP)** que proporciona análisis técnico profesional para criptomonedas. Diseñado específicamente para ser la **capa de datos** del sistema **Waickoff AI**, ofrece:

- **📊 Análisis técnico completo** - Volatilidad, volumen, Support/Resistance dinámicos
- **🎯 Grid trading inteligente** - Sugerencias basadas en datos reales del mercado
- **📈 Detección de patrones** - Volume Delta, divergencias, anomalías
- **🗄️ Repositorio de análisis** - Sistema avanzado de almacenamiento y consulta
- **📋 Generación de reportes** - Reportes automáticos diarios/semanales/personalizados
- **⚡ Cache inteligente** - Performance optimizado con invalidación granular
- **🧪 Testing completo** - 100+ test cases validando arquitectura modular
- **🏗️ Arquitectura modular** - Clean Architecture con 4 capas especializadas

---

## 🚀 **Inicio Rápido**

### **Instalación**
```bash
git clone [repository-url] waickoff_mcp
cd waickoff_mcp
npm install
npm run build
```

### **Configuración Claude Desktop**
Edita `%APPDATA%\Claude\claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "waickoff-mcp": {
      "command": "node", 
      "args": ["D:\\projects\\mcp\\waickoff_mcp\\build\\index.js"],
      "env": {}
    }
  }
}
```

### **¡Listo!** 
Reinicia Claude Desktop y pregunta: *"Genera un reporte diario de BTCUSDT"*

---

## 📊 **Funcionalidades Principales v1.6.4**

### **🎯 Análisis de Mercado en Tiempo Real**
- **`get_ticker`** - Precios actuales y estadísticas 24h
- **`get_orderbook`** - Profundidad del mercado y spread analysis
- **`get_market_data`** - Datos comprensivos (ticker + orderbook + klines)

### **📈 Análisis Técnico Avanzado**
- **`analyze_volatility`** - Evaluación de volatilidad para timing de grid
- **`analyze_volume`** - VWAP, picos de volumen, tendencias 
- **`analyze_volume_delta`** - Presión compradora vs vendedora con divergencias
- **`identify_support_resistance`** - Niveles dinámicos con scoring multi-factor
- **`perform_technical_analysis`** - **Análisis técnico completo** (TODO en uno)

### **🎯 Análisis Wyckoff Básico (NUEVO v1.6.4)**
- **`analyze_wyckoff_phase`** - Análisis completo de fase Wyckoff actual con interpretación
- **`detect_trading_range`** - Detección de rangos de consolidación/acumulación
- **`find_wyckoff_events`** - Búsqueda de springs, upthrusts, tests automática
- **`analyze_wyckoff_volume`** - Análisis de volumen en contexto Wyckoff (climax, dry-up)
- **`get_wyckoff_interpretation`** - Interpretación comprensiva con bias del mercado
- **`track_phase_progression`** - Seguimiento de progreso y timeline de fases
- **`validate_wyckoff_setup`** - Validación de setup con evaluación de riesgo

### **🎯 Detección de Trampas (NUEVO v1.6.4)**
- **`detect_bull_trap`** - Detecta falsas rupturas alcistas sobre resistencia
- **`detect_bear_trap`** - Detecta falsas rupturas bajistas bajo soporte
- **`get_trap_history`** - Historial de trampas para backtesting
- **`get_trap_statistics`** - Estadísticas de rendimiento de detección
- **`configure_trap_detection`** - Configuración de parámetros de detección
- **`validate_breakout`** - Validación de situaciones de ruptura actuales
- **`get_trap_performance`** - Métricas de rendimiento del servicio

### **📜 Análisis Histórico Completo (NUEVO v1.6.4)**
- **`get_historical_klines`** - Datos históricos OHLCV con metadata
- **`analyze_historical_sr`** - Análisis avanzado S/R histórico con scoring
- **`identify_volume_anomalies`** - Detección de eventos de volumen significativos
- **`get_price_distribution`** - Análisis distribución precios y value areas
- **`identify_market_cycles`** - Identificación de ciclos de mercado históricos
- **`get_historical_summary`** - Resumen comprehensivo análisis histórico

### **🎯 Trading y Grid Optimization**
- **`suggest_grid_levels`** - Configuraciones inteligentes basadas en volatilidad
- **`get_complete_analysis`** - **Análisis completo + recomendaciones**

### **🆕 Sistema de Repositorio Histórico (TASK-009)**
- **`get_analysis_history`** - Consulta análisis históricos guardados
- **`get_latest_analysis`** - Último análisis por tipo
- **`search_analyses`** - Búsqueda compleja con filtros avanzados
- **`get_analysis_by_id`** - Recuperar análisis específico por UUID
- **`get_analysis_summary`** - Resumen agregado por período
- **`get_aggregated_metrics`** - Métricas estadísticas de indicadores
- **`find_patterns`** - Búsqueda de patrones automática
- **`get_repository_stats`** - Estadísticas del repositorio

### **🆕 Sistema de Reportes Automáticos (TASK-009)**
- **`generate_daily_report`** - Reporte diario automático
- **`generate_weekly_report`** - Análisis semanal comprehensivo
- **`generate_symbol_report`** - Reporte detallado por símbolo
- **`generate_performance_report`** - Análisis de rendimiento del sistema
- **`get_report`** - Recuperar reporte por ID
- **`list_reports`** - Listar reportes disponibles
- **`export_report`** - Exportar reporte a archivo

### **🆕 Gestión de Cache Inteligente**
- **`get_cache_stats`** - Estadísticas y recomendaciones de cache
- **`clear_cache`** - Limpieza completa del cache
- **`invalidate_cache`** - Invalidación granular por símbolo/categoría

### **⚙️ Configuración y Sistema (NUEVO v1.6.4)**
- **`get_user_config`** - Configuración completa del usuario
- **`set_user_timezone`** - Configurar zona horaria con auto-detección
- **`detect_timezone`** - Auto-detectar zona horaria del sistema
- **`get_system_config`** - Configuración completa desde variables entorno
- **`validate_env_config`** - Validación configuración con recomendaciones
- **`get_mongo_config`** - Estado configuración MongoDB
- **`get_api_config`** - Configuración APIs externas
- **`get_analysis_config`** - Parámetros análisis técnico configurables
- **`get_grid_config`** - Configuración grid trading

### **🔧 Sistema y Debugging**
- **`get_system_health`** - Estado del sistema y métricas de performance
- **`get_debug_logs`** - Logs estructurados para troubleshooting
- **`test_storage`** - Testing del sistema de almacenamiento

---

## 🏗️ **Arquitectura del Sistema v1.6.4**

### **📐 Clean Architecture (4 Capas)**
```
📱 Presentation Layer (Adapters)
├── MCP Adapter (src/adapters/mcp.ts)
├── MCPHandlers (src/adapters/mcp-handlers.ts) - 🆕 Delegation pattern
├── MarketDataHandlers (src/adapters/handlers/marketDataHandlers.ts)
├── AnalysisRepositoryHandlers (src/adapters/handlers/analysisRepositoryHandlers.ts)
├── ReportGeneratorHandlers (src/adapters/handlers/reportGeneratorHandlers.ts)
├── CacheHandlers (src/adapters/cacheHandlers.ts)
└── [Future] REST API, WebSocket, CLI Adapters

🧠 Core Layer (Business Logic) 
├── Market Analysis Engine (src/core/engine.ts)
├── System Configuration
└── Health Monitoring

⚙️ Service Layer (Specialized Services)
├── Market Data Service (src/services/marketData.ts)
├── Technical Analysis Service (src/services/analysis.ts)
├── Trading Service (src/services/trading.ts)
├── Storage Service (src/services/storage/) - 🆕 Modularizado
├── Cache Manager (src/services/cacheManager.ts)
├── Analysis Repository (src/repositories/analysisRepository.ts)
└── Report Generator (src/repositories/reportGenerator.ts)

🛠️ Utility Layer (Common Tools)
├── Logger (src/utils/logger.ts)
├── Performance Monitor (src/utils/performance.ts)
└── Math Utils (src/utils/math.ts)
```

### **🎯 Principios de Diseño**
- **🆕 Delegation pattern** - MCPHandlers orquesta handlers especializados
- **Protocol-agnostic core** - Engine reutilizable desde cualquier protocolo
- **Dependency injection** - Servicios 100% testeables
- **Interface-based design** - Abstracciones para múltiples implementaciones
- **Performance monitoring** - Métricas automáticas en todas las capas
- **Error handling robusto** - Try/catch en cada operación

---

## 🧪 **Sistema de Testing v1.6.4**

### **✅ Tests Implementados (TASK-004 COMPLETADA)**
- **100+ test cases** validando arquitectura modular
- **8 categorías de tests** (4 críticas, 4 opcionales)
- **Test runner avanzado** con categorización inteligente
- **Prevención BUG-001** con tests específicos

### **🔧 Comandos de Testing**
```bash
# Test runner principal
npm run test:task-004

# Solo tests críticos
npm run test:critical

# Tests con cobertura
npm run test:coverage

# Categoría específica
npm run test:category "core engine"

# Listar categorías
npm run test:list

# Ayuda detallada
npm run test:help
```

### **📊 Categorías de Tests**
- **🔴 Core Engine Tests** - Business logic central
- **🔴 Handler Delegation Tests** - Patrón de delegación modular
- **🔴 Specialized Handler Tests** - MarketData, AnalysisRepository, Reports
- **🔴 Support/Resistance Logic Tests** - Prevención BUG-001
- **🟡 Cache Handler Tests** - Gestión de cache
- **🟡 Volume Delta Tests** - Cálculos matemáticos
- **🟡 Storage Service Tests** - Funcionalidad de almacenamiento
- **🟡 Cache Manager Tests** - Manager de cache existente

**📖 Manual Completo:** [Testing Manual](claude/docs/testing-manual.md)

---

## 💡 **Casos de Uso v1.6.4**

### **📺 Casos de Uso para Smart Money Concepts (NUEVO v1.6.5)**
```bash
# Detectar Order Blocks institucionales
"Detecta order blocks en BTCUSDT con fuerza mínima de 80"

# Validar si un Order Block sigue activo
"Valida si el order block ob_bullish_1234567890_45632 de ETHUSDT sigue siendo válido"

# Obtener zonas categorizadas por fuerza
"Muestra las zonas de order blocks de XRPUSDT categorizadas por fuerza"
```

### **📈 Para Análisis Técnico**
```bash
# Análisis completo con auto-guardado
"Analiza XRPUSDT técnicamente con todas las herramientas"

# Recuperar último análisis
"Muestra mi último análisis de BTCUSDT"

# Buscar análisis históricos
"Busca análisis de ETHUSDT de la semana pasada"
```

### **🎯 Para Grid Trading**
```bash
# Configuración inteligente
"Sugiere niveles de grid para SOLUSDT con $2000"

# Con contexto histórico
"¿Cómo se comportó el grid de ADAUSDT históricamente?"
```

### **📋 Para Reportes Automáticos**
```bash
# Reporte diario
"Genera un reporte diario de mercado para XRPUSDT y HBARUSDT"

# Reporte semanal
"Crea un reporte semanal de mi portfolio"

# Reporte por símbolo
"Análisis completo de ONDOUSDT en los últimos 7 días"
```

### **🗄️ Para Análisis Histórico Avanzado**
```bash
# Métricas agregadas
"Muestra la volatilidad promedio de BTCUSDT en el último mes"

# Patrones detectados
"¿Qué patrones ha detectado el sistema en XRPUSDT?"

# Estadísticas del repositorio
"¿Cuántos análisis tengo guardados y de qué tipos?"
```

---

## 🔧 **Comandos de Desarrollo**

### **📦 Build y Ejecución**
```bash
npm run build         # Compilar TypeScript
npm run dev          # Modo desarrollo con watch
npm start            # Ejecutar MCP compilado
npm run clean        # Limpiar archivos build
```

### **🧪 Testing y Quality**
```bash
npm run test:task-004    # Test runner completo
npm run test:critical    # Solo tests críticos
npm run test:coverage    # Tests con cobertura
npm run test:category    # Categoría específica
npm run lint             # Verificar código con ESLint
npm run docs             # Generar documentación TypeDoc
```

### **🔍 Debugging**
```bash
# Ver logs del sistema
node scripts/check-compile.js

# Test de compilación rápido
node scripts/quick-compile.js

# Verificar errores JSON
node scripts/test-json.js
```

---

## 📂 **Estructura del Proyecto v1.6.4**

```
waickoff_mcp/
├── 📁 src/                          # Código fuente TypeScript
│   ├── 📁 adapters/                 # Presentation layer
│   │   ├── 📁 handlers/             # 🆕 Handlers especializados
│   │   ├── mcp-handlers.ts          # 🆕 Orquestador delegation pattern
│   │   └── cacheHandlers.ts         # 🆕 Cache management
│   ├── 📁 core/                     # Business logic
│   ├── 📁 services/                 # Specialized services
│   │   └── 📁 storage/              # 🆕 Storage modularizado
│   ├── 📁 repositories/             # 🆕 Data access layer
│   ├── 📁 types/                    # Type definitions
│   └── 📁 utils/                    # Common utilities
├── 📁 build/                        # Archivos compilados JavaScript
├── 📁 scripts/                      # Scripts de desarrollo
│   └── test-runner.mjs              # 🆕 Test runner avanzado
├── 📁 tests/                        # 🆕 Sistema completo de tests
│   ├── 📁 core/                     # Tests de business logic
│   ├── 📁 adapters/                 # Tests de handlers
│   │   └── 📁 handlers/             # Tests especializados
│   └── 📁 services/                 # Tests de servicios
├── 📁 storage/                      # Sistema de almacenamiento local
│   ├── 📁 analysis/                 # Análisis guardados automáticamente
│   ├── 📁 patterns/                 # 🆕 Patrones detectados
│   ├── 📁 decisions/                # 🆕 Decisiones históricas
│   └── 📁 reports/                  # 🆕 Reportes generados
├── 📁 claude/                       # Documentación y trazabilidad
│   ├── 📁 docs/                     # Documentación técnica
│   │   ├── user-guide.md            # 🆕 Guía de usuario actualizada
│   │   └── testing-manual.md        # 🆕 Manual de testing
│   ├── 📁 tasks/                    # Task tracking
│   ├── 📁 bugs/                     # Bug management
│   └── 📁 lessons-learned/          # Knowledge management
├── 📁 logs/                         # Sistema de logging
└── 📄 package.json                  # Configuración del proyecto
```

---

## 📊 **Estado del Proyecto v1.6.4**

### **✅ Completado**
- **✅ Análisis técnico completo** - Volatilidad, volumen, Support/Resistance
- **✅ Grid trading inteligente** - Sugerencias basadas en datos reales
- **✅ Volume Delta avanzado** - Presión compradora/vendedora + divergencias
- **✅ Support/Resistance dinámicos** - Algoritmo multi-factor con scoring
- **✅ Sistema de logging profesional** - Debugging y troubleshooting completo
- **✅ Arquitectura modular** - Clean Architecture con delegation pattern
- **✅ TASK-009 COMPLETADA** - Storage System con 4 fases (15 herramientas nuevas)
- **✅ TASK-004 COMPLETADA** - Sistema completo de tests unitarios
- **✅ TASK-005 COMPLETADA** - Análisis Wyckoff básico (7 herramientas)
- **✅ TASK-010 COMPLETADA** - Sistema configuración timezone persistente
- **✅ TASK-012 COMPLETADA** - Detección trampas alcistas/bajistas (7 herramientas)
- **✅ TASK-015b COMPLETADA** - Soporte .env cross-platform (9 herramientas)
- **✅ TASK-017 COMPLETADA** - Sistema análisis histórico (6 herramientas)
- **✅ TASK-018 COMPLETADA** - Modularización completa MCP (eliminación corrupción)
- **✅ TASK-019 COMPLETADA** - Resolución errores compilación TypeScript
- **✅ Auto-save automático** - Todos los análisis se guardan automáticamente
- **✅ Repositorio de análisis** - 7 herramientas de consulta avanzada
- **✅ Sistema de reportes** - 8 herramientas de generación automática
- **✅ Cache inteligente** - Performance optimizado con TTL
- **✅ Análisis Wyckoff** - 15 fases identificadas, springs, upthrusts, tests
- **✅ Detección de trampas** - Bull/bear traps con análisis multi-señal
- **✅ Análisis histórico** - S/R histórico, anomalías volumen, ciclos mercado
- **✅ Sistema modular MCP** - 93.3% reducción archivo principal, corrupción eliminada

### **📅 Roadmap Próximo**
- **TASK-013** - Datos on-chain: stablecoins, ballenas, exchanges (15h)
- **TASK-015** - Dual Storage MongoDB experimental (6h)
- **TASK-016** - Migración MongoDB completa (8-12h, condicional)
- **TASK-018** - Sistema Wyckoff avanzado: Composite Man, multi-timeframe (8-10h)
- **TASK-019** - Herramientas análisis técnico: Fibonacci, Elliott, Bollinger (8h)
- **TASK-020** - Smart Money Concepts para trading algorítmico (10h)
- **v2.0** - Integración completa con Waickoff AI
- **v2.1** - Support para múltiples exchanges (Binance, Coinbase)

---

## 🤝 **Integración con Waickoff AI**

### **🎯 Diseño Específico para AI**
- **Datos estructurados** - Formato JSON optimizado para LLMs
- **Contexto histórico** - Base de conocimiento creciente (análisis + reportes)
- **Auto-save inteligente** - Memoria persistente entre sesiones
- **Protocol-agnostic** - Core reutilizable desde Python/FastAPI
- **Shared storage** - Sistema de intercambio bidireccional
- **🆕 Analytics avanzado** - Métricas agregadas y pattern recognition

### **📡 APIs Preparadas**
- **MCP Protocol** - Actual (Claude Desktop) - 40+ herramientas
- **REST API** - Futuro (FastAPI integration)
- **WebSocket** - Futuro (Real-time streaming)
- **CLI Interface** - Futuro (Command line tools)

---

## 📚 **Documentación v1.6.4**

### **📖 Guías de Usuario**
- **🆕 [User Guide v1.6.5](claude/docs/user-guide.md)** - Guía completa actualizada con 77+ herramientas
- **💰 [Smart Money Concepts Guide](claude/docs/user-guide-smc.md)** - Guía completa Smart Money Concepts
- **🆕 [Testing Manual](claude/docs/testing-manual.md)** - Manual completo del sistema de testing
- **[API Reference](claude/docs/api/tools-reference.md)** - Referencia completa de herramientas
- **[Volume Analysis Guide](VOLUME_ANALYSIS_GUIDE.md)** - Guía de análisis de volumen
- **[Integration Guide](INTEGRACION_WAICKOFF.md)** - Integración con Waickoff AI

### **🏗️ Documentación Técnica**
- **[Architecture Overview](claude/docs/architecture/system-overview.md)** - Arquitectura completa
- **[ADR Log](claude/decisions/adr-log.md)** - Architecture Decision Records
- **[Bug Reports](claude/bugs/README.md)** - Gestión de bugs y resoluciones
- **[Lessons Learned](claude/lessons-learned/README.md)** - Knowledge management
- **🆕 [TASK-004 Completed](claude/tasks/TASK-004-COMPLETED.md)** - Documentación tests

### **📈 Proyecto Management**
- **[Master Log](claude/master-log.md)** - Estado actual del proyecto
- **[Task Tracker](claude/tasks/task-tracker.md)** - Tracking de tareas
- **[Roadmap Avanzado](ROADMAP_AVANZADO.md)** - Visión a largo plazo

---

## ⚙️ **Configuración Avanzada**

### **🔧 Variables de Entorno**
```bash
# .env (opcional)
BYBIT_API_URL=https://api.bybit.com
LOG_LEVEL=info
STORAGE_PATH=./storage
CACHE_TTL=3600
```

### **📊 Performance Tuning**
```json
// package.json scripts personalizados
{
  "scripts": {
    "build:prod": "tsc --build --verbose",
    "dev:watch": "tsc --watch --preserveWatchOutput",
    "health:check": "node build/index.js --health-check"
  }
}
```

---

## 🐛 **Troubleshooting v1.4.0**

### **❓ Problemas Comunes**

#### **Tests no ejecutan**
```bash
# Verificar setup de testing
npm run test:help

# Ejecutar validación completa
npm run test:task-004
```

#### **Cache problems**
```bash
# Verificar estadísticas de cache
# Usar: get_cache_stats desde Claude Desktop

# Limpiar cache si es necesario
# Usar: clear_cache true desde Claude Desktop
```

#### **Performance lento**
```bash
# Verificar cache hit rate
# Usar: get_cache_stats

# Invalidar cache específico
# Usar: invalidate_cache SYMBOL
```

### **🔍 Debugging Avanzado**
```bash
# Sistema completo de debugging disponible desde Claude Desktop:
get_debug_logs           # Logs estructurados
get_system_health        # Estado del sistema
get_cache_stats          # Performance de cache
get_repository_stats     # Estado del almacenamiento
```

---

## 🏆 **Credits & Agradecimientos**

### **🤖 Desarrollado para**
- **Waickoff AI** - Sistema de trading inteligente con IA
- **Claude Desktop** - Interface principal del usuario
- **Análisis técnico profesional** - Traders y analistas

### **🛠️ Tecnologías Utilizadas**
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Node.js](https://nodejs.org/)** - Runtime JavaScript
- **[MCP SDK](https://modelcontextprotocol.io/)** - Model Context Protocol
- **[Bybit API v5](https://bybit-exchange.github.io/docs/)** - Market data source
- **[Jest](https://jestjs.io/)** - Testing framework

---

## 📊 **Métricas del Proyecto v1.6.5**

- **77+ herramientas MCP** disponibles (3 nuevas Smart Money Concepts)
- **100+ test cases** implementados
- **15+ módulos** en arquitectura modular
- **11+ tareas completadas** (TASK-004 a TASK-020 FASE 1)
- **0 errores TypeScript** en compilación
- **93.3% reducción** archivo principal MCP (eliminación corrupción)
- **8 categorías análisis** (Técnico, Wyckoff, Trampas, Histórico, Smart Money, etc.)
- **2000+ líneas** de código de tests robusto
- **Cross-platform** soporte completo (Windows, Linux, macOS)

---

## 📜 **Licencia**

**Proyecto privado** - Desarrollado específicamente para el ecosistema Waickoff AI.

---

## 📞 **Soporte**

Para issues, bugs o sugerencias:
1. **Revisar [Testing Manual](claude/docs/testing-manual.md)** para tests
2. **Revisar [User Guide v1.4.0](claude/docs/user-guide.md)** para funcionalidades
3. **Usar herramienta `get_debug_logs`** para diagnóstico
4. **Consultar [Bug Reports](claude/bugs/README.md)** para problemas conocidos
5. **Ejecutar `npm run test:critical`** para validación rápida

---

*Última actualización: 11/06/2025 | v1.6.5 | Estado: Production Ready + Documentación Completa*
