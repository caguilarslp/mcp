# 🤖 wAIckoff MCP Server v1.3.6

> **Servidor MCP avanzado para análisis de mercado crypto con integración Bybit**
> 
> Sistema modular de análisis técnico diseñado para alimentar **Waickoff AI** con datos precisos y contexto histórico para decisiones de trading inteligentes.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Protocol-blue)](https://modelcontextprotocol.io/)
[![Bybit](https://img.shields.io/badge/Bybit-API-orange)](https://bybit.com/)

---

## 🎯 **¿Qué es wAIckoff MCP?**

**wAIckoff MCP** es un servidor de **Model Context Protocol (MCP)** que proporciona análisis técnico profesional para criptomonedas. Diseñado específicamente para ser la **capa de datos** del sistema **Waickoff AI**, ofrece:

- **📊 Análisis técnico completo** - Volatilidad, volumen, Support/Resistance dinámicos
- **🎯 Grid trading inteligente** - Sugerencias basadas en datos reales del mercado
- **📈 Detección de patrones** - Volume Delta, divergencias, anomalías
- **🗄️ Auto-guardado de análisis** - Historia persistente para contexto futuro
- **🔍 Sistema de debugging avanzado** - Logs estructurados y troubleshooting
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
Reinicia Claude Desktop y pregunta: *"Analiza BTCUSDT para grid trading"*

---

## 📊 **Funcionalidades Principales**

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

### **🎯 Trading y Grid Optimization**
- **`suggest_grid_levels`** - Configuraciones inteligentes basadas en volatilidad
- **`get_complete_analysis`** - **Análisis completo + recomendaciones**

### **🗄️ Gestión de Datos e Historia**
- **`get_analysis_history`** - Consulta análisis históricos guardados
- **Auto-save automático** - Todos los análisis se guardan automáticamente
- **Sistema de storage inteligente** - Base de conocimiento creciente

### **🔧 Sistema y Debugging**
- **`get_system_health`** - Estado del sistema y métricas de performance
- **`get_api_stats`** - Estadísticas de conexión y errores
- **`get_debug_logs`** - Logs estructurados para troubleshooting

---

## 🏗️ **Arquitectura del Sistema**

### **📐 Clean Architecture (4 Capas)**
```
📱 Presentation Layer (Adapters)
├── MCP Adapter (src/adapters/mcp.ts)
├── [Future] REST API Adapter  
├── [Future] WebSocket Adapter
└── [Future] CLI Adapter

🧠 Core Layer (Business Logic) 
├── Market Analysis Engine (src/core/engine.ts)
├── System Configuration
└── Health Monitoring

⚙️ Service Layer (Specialized Services)
├── Market Data Service (src/services/marketData.ts)
├── Technical Analysis Service (src/services/analysis.ts)
└── Trading Service (src/services/trading.ts)

🛠️ Utility Layer (Common Tools)
├── Logger (src/utils/logger.ts)
├── Performance Monitor (src/utils/performance.ts)
└── Math Utils (src/utils/math.ts)
```

### **🎯 Principios de Diseño**
- **Protocol-agnostic core** - Engine reutilizable desde cualquier protocolo
- **Dependency injection** - Servicios 100% testeables
- **Interface-based design** - Abstracciones para múltiples implementaciones
- **Performance monitoring** - Métricas automáticas en todas las capas
- **Error handling robusto** - Try/catch en cada operación

---

## 💡 **Casos de Uso**

### **📈 Para Análisis Técnico**
```bash
# Análisis completo de un símbolo
"Analiza XRPUSDT técnicamente con todas las herramientas"

# Identificar niveles clave
"Identifica support y resistance de BTCUSDT en timeframe 1h"

# Detectar señales de volumen
"Analiza volume delta de ETHUSDT en los últimos 60 períodos"
```

### **🎯 Para Grid Trading**
```bash
# Configuración de grid inteligente
"Sugiere niveles de grid para SOLUSDT con $2000 de inversión"

# Análisis de timing 
"¿Es buen momento para grid trading en ADAUSDT?"

# Análisis completo con recomendaciones
"Análisis completo de AVAXUSDT para grid con $1500"
```

### **🗄️ Para Análisis Histórico**
```bash
# Consultar análisis previos
"Muestra el historial de análisis de BTCUSDT de los últimos 7 días"

# Comparar comportamiento histórico
"¿Cómo se comportó XRP las últimas veces en este precio?"
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
npm run test         # Tests unitarios (TASK-004 pendiente)
npm run lint         # Verificar código con ESLint
npm run docs         # Generar documentación TypeDoc
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

## 📂 **Estructura del Proyecto**

```
waickoff_mcp/
├── 📁 src/                          # Código fuente TypeScript
│   ├── 📁 adapters/                 # Presentation layer
│   ├── 📁 core/                     # Business logic
│   ├── 📁 services/                 # Specialized services
│   ├── 📁 types/                    # Type definitions
│   └── 📁 utils/                    # Common utilities
├── 📁 build/                        # Archivos compilados JavaScript
├── 📁 scripts/                      # Scripts de desarrollo
├── 📁 storage/                      # Sistema de almacenamiento local
│   └── 📁 analysis/                 # Análisis guardados automáticamente
├── 📁 claude/                       # Documentación y trazabilidad
│   ├── 📁 docs/                     # Documentación técnica
│   ├── 📁 tasks/                    # Task tracking
│   ├── 📁 bugs/                     # Bug management
│   └── 📁 lessons-learned/          # Knowledge management
├── 📁 tests/                        # Tests unitarios
├── 📁 logs/                         # Sistema de logging
└── 📄 package.json                  # Configuración del proyecto
```

---

## 📊 **Estado del Proyecto**

### **✅ Completado (v1.3.6)**
- **Análisis técnico completo** - Volatilidad, volumen, Support/Resistance
- **Grid trading inteligente** - Sugerencias basadas en datos reales
- **Volume Delta avanzado** - Presión compradora/vendedora + divergencias
- **Support/Resistance dinámicos** - Algoritmo multi-factor con scoring
- **Sistema de logging profesional** - Debugging y troubleshooting completo
- **Arquitectura modular** - Clean Architecture con 15+ módulos
- **Auto-save automático** - Todos los análisis se guardan automáticamente
- **Sistema de trazabilidad** - Documentación completa y gestión de bugs

### **🚧 En Desarrollo**
- **TASK-004** - Tests unitarios para todas las funciones core
- **TASK-009** - Sistema de storage avanzado (5 fases)

### **📅 Roadmap**
- **v1.4** - Tests completos + Storage system completado
- **v1.5** - Detección de patrones Wyckoff básicos
- **v2.0** - Integración completa con Waickoff AI
- **v2.1** - Support para múltiples exchanges (Binance, Coinbase)

---

## 🤝 **Integración con Waickoff AI**

### **🎯 Diseño Específico para AI**
- **Datos estructurados** - Formato JSON optimizado para LLMs
- **Contexto histórico** - Base de conocimiento creciente
- **Auto-save inteligente** - Memoria persistente entre sesiones
- **Protocol-agnostic** - Core reutilizable desde Python/FastAPI
- **Shared storage** - Sistema de intercambio bidireccional

### **📡 APIs Preparadas**
- **MCP Protocol** - Actual (Claude Desktop)
- **REST API** - Futuro (FastAPI integration)
- **WebSocket** - Futuro (Real-time streaming)
- **CLI Interface** - Futuro (Command line tools)

---

## 📚 **Documentación**

### **📖 Guías de Usuario**
- **[API Reference](claude/docs/api/tools-reference.md)** - Referencia completa de herramientas
- **[Volume Analysis Guide](VOLUME_ANALYSIS_GUIDE.md)** - Guía de análisis de volumen
- **[Integration Guide](INTEGRACION_WAICKOFF.md)** - Integración con Waickoff AI

### **🏗️ Documentación Técnica**
- **[Architecture Overview](claude/docs/architecture/system-overview.md)** - Arquitectura completa
- **[ADR Log](claude/decisions/adr-log.md)** - Architecture Decision Records
- **[Bug Reports](claude/bugs/README.md)** - Gestión de bugs y resoluciones
- **[Lessons Learned](claude/lessons-learned/README.md)** - Knowledge management

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

## 🐛 **Troubleshooting**

### **❓ Problemas Comunes**

#### **Error: "JSON at position 5"**
```bash
# Solución: Error del MCP SDK, ya suprimido automáticamente
# Verificar con:
npm run build && node build/index.js
```

#### **Claude Desktop no detecta el MCP**
```bash
# Verificar configuración:
cat "%APPDATA%\Claude\claude_desktop_config.json"

# Verificar compilación:
npm run build
```

#### **Performance lento**
```bash
# Verificar logs:
# Usar herramienta get_debug_logs desde Claude Desktop
```

### **🔍 Debugging Avanzado**
```bash
# Ver logs estructurados
node -e "console.log(require('./logs/mcp-requests-' + new Date().toISOString().split('T')[0] + '.json'))"

# Health check completo
# Usar herramienta get_system_health desde Claude Desktop
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

---

## 📜 **Licencia**

**Proyecto privado** - Desarrollado específicamente para el ecosistema Waickoff AI.

---

## 📞 **Soporte**

Para issues, bugs o sugerencias:
1. **Revisar [Common Issues](claude/docs/troubleshooting/common-issues.md)**
2. **Usar herramienta `get_debug_logs`** para diagnóstico
3. **Consultar [Bug Reports](claude/bugs/README.md)** para problemas conocidos
4. **Crear issue** en el sistema de tracking interno

---

*Última actualización: 10/06/2025 | v1.3.6 | Estado: Production Ready*
