# 🚀 Getting Started - wAIckoff MCP Server

Guía de inicio rápido para comenzar a usar el servidor MCP wAIckoff.

## 📋 Requisitos Previos

### Sistema
- **Node.js**: v18 o superior
- **npm**: v8 o superior
- **TypeScript**: v5 o superior
- **Sistema operativo**: Windows, macOS, Linux

### Claude Desktop
- **Claude Desktop App** instalada
- **Configuración MCP** habilitada

## ⚡ Instalación Rápida

### 1. Clonar y Configurar
```bash
# Clonar repositorio
git clone <repository-url>
cd waickoff_mcp

# Instalar dependencias
npm install

# Compilar proyecto
npm run build
```

### 2. Configurar Claude Desktop

Edita el archivo de configuración de Claude:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  \"mcpServers\": {
    \"waickoff\": {
      \"command\": \"node\",
      \"args\": [\"path/to/waickoff_mcp/build/index.js\"],
      \"env\": {
        \"NODE_ENV\": \"production\"
      }
    }
  }
}
```

### 3. Reiniciar Claude Desktop

Cierra y vuelve a abrir Claude Desktop para cargar la configuración.

## 🎯 Primera Conexión

### Verificar Estado del Sistema
```
get_system_health
```

**Respuesta esperada:**
```json
{
  \"system_status\": \"HEALTHY\",
  \"version\": \"1.8.0\",
  \"uptime\": \"X hours\",
  \"services\": {
    \"market_data\": \"ONLINE\",
    \"analysis\": \"ONLINE\",
    \"trading\": \"ONLINE\"
  }
}
```

### Primer Análisis
```
get_ticker symbol=\"BTCUSDT\"
```

## 📊 Herramientas Disponibles (106+)

### Market Data (4 herramientas)
- `get_ticker` - Datos de ticker
- `get_orderbook` - Libro de órdenes
- `get_market_data` - Datos completos
- `get_historical_klines` - Datos históricos

### Technical Analysis (4 herramientas)
- `analyze_volatility` - Análisis de volatilidad
- `analyze_volume` - Análisis de volumen
- `analyze_volume_delta` - Delta de volumen
- `identify_support_resistance` - Soporte y resistencia

### Smart Money Concepts (14 herramientas)
- `detect_order_blocks` - Detectar Order Blocks
- `find_fair_value_gaps` - Encontrar FVG
- `detect_break_of_structure` - Detectar BOS
- `analyze_smart_money_confluence` - Confluencias SMC
- `get_smc_market_bias` - Bias de mercado SMC
- `validate_smc_setup` - Validar setup SMC
- `get_smc_dashboard` - Dashboard SMC
- `get_smc_trading_setup` - Setup de trading SMC
- `analyze_smc_confluence_strength` - Fuerza de confluencias
- Y más...

### Wyckoff Analysis (14 herramientas)
- `analyze_wyckoff_phase` - Análisis de fase
- `detect_trading_range` - Detectar rango
- `find_wyckoff_events` - Eventos Wyckoff
- `analyze_composite_man` - Composite Man
- `analyze_multi_timeframe_wyckoff` - Multi-timeframe
- Y más...

### Grid Trading (1 herramienta)
- `suggest_grid_levels` - Sugerencias de grid

### Historical Analysis (6 herramientas)
- `analyze_historical_sr` - S/R histórico
- `identify_volume_anomalies` - Anomalías de volumen
- `get_price_distribution` - Distribución de precios
- `identify_market_cycles` - Ciclos de mercado
- `get_historical_summary` - Resumen histórico

### Multi-Exchange (11 herramientas)
- `get_aggregated_ticker` - Ticker agregado
- `get_composite_orderbook` - Orderbook compuesto
- `detect_exchange_divergences` - Divergencias
- `identify_arbitrage_opportunities` - Arbitraje
- `get_exchange_dominance` - Dominancia
- `get_multi_exchange_analytics` - Analytics
- Y features avanzados (placeholders)

### Technical Indicators (4 herramientas)
- `calculate_fibonacci_levels` - Niveles Fibonacci
- `analyze_bollinger_bands` - Bollinger Bands
- `detect_elliott_waves` - Elliott Waves
- `find_technical_confluences` - Confluencias técnicas

### Trap Detection (7 herramientas)
- `detect_bull_trap` - Trampa alcista
- `detect_bear_trap` - Trampa bajista
- `get_trap_history` - Historial de trampas
- `get_trap_statistics` - Estadísticas
- Y más...

### Storage & Reports (15 herramientas)
- `get_analysis_by_id` - Obtener análisis por ID
- `search_analyses` - Buscar análisis
- `generate_report` - Generar reporte
- `get_cache_stats` - Estadísticas de cache
- Y más...

### Configuration (16 herramientas)
- `get_user_config` - Configuración de usuario
- `set_user_timezone` - Configurar zona horaria
- `get_system_config` - Configuración del sistema
- `validate_config` - Validar configuración
- Y más...

## 🎨 Ejemplos de Uso

### Análisis Básico
```
# Obtener datos de mercado
get_market_data symbol=\"ETHUSDT\"

# Análisis técnico completo
perform_technical_analysis symbol=\"ETHUSDT\"

# Análisis completo con grid
get_complete_analysis symbol=\"ETHUSDT\" investment=1000
```

### Smart Money Concepts
```
# Detectar Order Blocks
detect_order_blocks symbol=\"BTCUSDT\" timeframe=\"60\"

# Dashboard SMC completo
get_smc_dashboard symbol=\"BTCUSDT\"

# Validar setup de trading
validate_smc_setup symbol=\"BTCUSDT\" setupType=\"long\"
```

### Wyckoff Analysis
```
# Analizar fase actual
analyze_wyckoff_phase symbol=\"BTCUSDT\"

# Detectar eventos Wyckoff
find_wyckoff_events symbol=\"BTCUSDT\"

# Análisis avanzado Composite Man
analyze_composite_man symbol=\"BTCUSDT\"
```

### Multi-Exchange
```
# Obtener datos agregados
get_aggregated_ticker symbol=\"BTCUSDT\"

# Detectar divergencias entre exchanges
detect_exchange_divergences symbol=\"BTCUSDT\"

# Identificar oportunidades de arbitraje
identify_arbitrage_opportunities symbol=\"BTCUSDT\"
```

## ⚙️ Configuración Inicial

### Zona Horaria
```
# Detectar zona horaria automáticamente
detect_timezone

# Configurar manualmente
set_user_timezone timezone=\"America/Mexico_City\"
```

### Configuración del Sistema
```
# Ver configuración actual
get_user_config

# Ver estado del sistema
get_system_config
```

## 🔍 Monitoreo

### Rendimiento
```
# Estado del sistema
get_system_health

# Estadísticas de cache
get_cache_stats

# Logs de debug
get_debug_logs
```

### Historial
```
# Historial de análisis
get_analysis_history symbol=\"BTCUSDT\" limit=10

# Estadísticas del repositorio
get_repository_stats
```

## 🚨 Solución de Problemas

### Problemas Comunes

1. **\"Connection error\"**
   - Verificar conexión a internet
   - Revisar firewall/proxy
   - El sistema tiene retry logic automático

2. **\"No data found\"**
   - Verificar símbolo correcto (ej: \"BTCUSDT\")
   - Probar con diferentes timeframes
   - Sistema tiene múltiples fallbacks

3. **\"Service unavailable\"**
   - Usar `get_system_health` para diagnosticar
   - Revisar logs con `get_debug_logs`
   - Reiniciar Claude Desktop

### Comandos de Diagnóstico
```
# Estado completo del sistema
get_system_health

# Logs detallados
get_debug_logs logType=\"errors\" limit=20

# Validar configuración
validate_config

# Limpiar cache si es necesario
clear_cache
```

## 📈 Próximos Pasos

1. **Explora las herramientas** - Prueba diferentes análisis
2. **Lee las guías específicas** - Smart Money, Wyckoff, etc.
3. **Configura tu zona horaria** - Para análisis temporal preciso
4. **Experimenta con multi-exchange** - Para análisis avanzado

## 🔗 Enlaces Útiles

- [Quick Reference](quick-reference.md) - Comandos rápidos
- [Smart Money Guide](smart-money-concepts-guide.md) - Guía SMC
- [Wyckoff Guide](wyckoff-analysis-guide.md) - Guía Wyckoff
- [Troubleshooting](troubleshooting-guide.md) - Solución de problemas

---

*¡Bienvenido al servidor MCP más avanzado para análisis de mercados!*
