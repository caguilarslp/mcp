# Bybit MCP Server v1.1.0

MCP Server personalizado para trading en Bybit con funciones optimizadas para grid trading, análisis técnico y volume profiling basado en el método Wyckoff.

## Funcionalidades

### 🎯 Tools Principales:
- **get_ticker**: Precios en tiempo real y estadísticas
- **get_orderbook**: Análisis de profundidad del mercado
- **suggest_grid_levels**: Sugerencias inteligentes para grid trading
- **get_klines**: Datos de velas para análisis técnico
- **analyze_volatility**: Análisis de volatilidad para timing óptimo
- **get_volume_analysis** 🆕: Análisis de volumen tradicional con VWAP y detección de anomalías
- **get_volume_delta** 🆕: Presión compradora/vendedora y detección de divergencias

### 🛠️ Instalación

```bash
cd bybit-mcp
npm install
npm run build
```

### ⚙️ Configuración para Claude Desktop

#### Opción 1: Configuración Automática (Recomendado)
1. Abre el archivo `%APPDATA%\Claude\claude_desktop_config.json`
2. Agrega esta configuración:
```json
{
  "mcpServers": {
    "bybit-mcp": {
      "command": "node",
      "args": ["D:\\projects\\mcp\\bybit-mcp\\build\\index.js"],
      "env": {}
    }
  }
}
```
3. Reinicia Claude Desktop
4. El MCP se cargará automáticamente cada vez que abras Claude

#### Opción 2: Uso Manual
```bash
cd D:\projects\mcp\bybit-mcp
npm start
```

### 🚀 Uso

Una vez configurado, puedes preguntar:

#### Básico:
- "¿Cuál es el precio actual de XRP/USDT?"
- "Analiza la volatilidad de SOL en las últimas 24 horas"
- "Sugiere niveles de grid para BTC con $1000"
- "Muestra el orderbook de AVAX/USDT"

#### Avanzado (v1.1):
- "Analiza el volumen de XRP/USDT en las últimas 24 horas"
- "Muestra el volume delta de BTC en intervalos de 5 minutos"
- "Detecta divergencias en HBAR/USDT"
- "Análisis completo de XRP para grid trading" (combina todas las herramientas)

### 📊 Características Especiales

- **Sin API Keys requeridas** - Usa endpoints públicos de Bybit
- **Optimizado para Grid Trading** - Sugerencias basadas en volatilidad
- **Análisis de Timing** - Determina cuándo es mejor activar grids
- **Datos en tiempo real** - Información actualizada del mercado
- **Volume Profiling** - Análisis de volumen estilo Wyckoff
- **Detección de Divergencias** - Alertas tempranas de reversiones
- **VWAP Integrado** - Niveles de equilibrio precio/volumen

### 📦 Estructura del Proyecto

```
bybit-mcp/
├── src/
│   └── index.ts          # Código principal del MCP
├── build/               # Archivos compilados
├── package.json         # Configuración del proyecto
├── tsconfig.json        # Configuración TypeScript
├── README.md            # Este archivo
├── ROADMAP_AVANZADO.md  # Plan de desarrollo futuro
└── VOLUME_ANALYSIS_GUIDE.md # Guía de uso de herramientas de volumen
```

### 🔧 Desarrollo

Para contribuir o modificar:

```bash
# Modo desarrollo con auto-compilación
npm run dev

# Compilar cambios
npm run build

# Limpiar archivos compilados
npm run clean
```

### 📈 Roadmap

- ✅ v1.0: Funcionalidades básicas de trading
- ✅ v1.1: Análisis de volumen y divergencias
- 🔄 v1.2: Support/Resistance dinámicos
- 📢 v1.3: Integración con API Keys para datos avanzados
- 🎯 v2.0: Integración completa con Waickoff AI
