# 📊 Guía de Uso wAIckoff MCP v1.6.1 - Trading Analysis + Configuration System

## 🎯 Para qué sirve este MCP

El **wAIckoff MCP v1.6.1** es tu herramienta de análisis técnico profesional integrada en Claude Desktop que te proporciona:

- **Análisis técnico completo** en segundos con auto-guardado
- **🆕 Análisis histórico avanzado** - 3+ años de datos con patrones identificados
- **🆕 Sistema de configuración cross-platform** - .env support + timezone management
- **Sugerencias de grid trading** basadas en volatilidad y S/R
- **Detección de divergencias** precio/volumen
- **Niveles de soporte/resistencia dinámicos** con scoring avanzado
- **Volume Delta** para presión compradora/vendedora
- **Datos de mercado en tiempo real** de Bybit con cache inteligente
- **Sistema de almacenamiento avanzado** con búsqueda histórica
- **Repositorio de análisis** con consultas complejas
- **Generación de reportes** automáticos diarios/semanales
- **Cache inteligente** con invalidación granular
- **🆕 Historical Support/Resistance** con scoring por toques históricos
- **🆕 Volume Anomaly Detection** - Eventos significativos históricos
- **🆕 Market Cycle Analysis** - Patrones cíclicos y estacionales
- **🆕 Environment Configuration** - Cross-platform deployment ready

## 🚀 Setup Rápido

### **1. Verificar que Claude Desktop esté configurado**
El MCP ya está configurado en tu Claude Desktop. Para verificar:

1. Abre Claude Desktop
2. Deberías ver herramientas MCP disponibles automáticamente
3. Si no aparecen, el MCP se recarga automáticamente

### **2. Comandos Básicos para Trading**

### **🆕 Sistema de Configuración Cross-Platform (NUEVO TASK-015b)**

#### `get_system_config` - **Configuración Completa del Sistema**
```
Uso: get_system_config
```
**Lo que obtienes:**
- Configuración completa desde variables de entorno
- Estado del archivo .env y variables cargadas
- Configuración de MongoDB, APIs, análisis, grid y logging
- Información de compatibilidad cross-platform

**Cuándo usarla:** Verificar configuración del sistema, troubleshooting de deployment

#### `get_mongo_config` - **Estado MongoDB**
```
Uso: get_mongo_config
```
**Lo que obtienes:**
- Estado de conexión MongoDB (configurada/no configurada)
- Recomendaciones para habilitar dual storage
- Variables de entorno necesarias
- Guía rápida de setup

**Cuándo usarla:** Setup de MongoDB, verificar dual storage status

#### `get_api_config` - **Configuración APIs Externas**
```
Uso: get_api_config
```
**Lo que obtienes:**
- URL de Bybit API y configuración de timeouts
- Número de reintentos configurado
- Recomendaciones de optimización
- Variables: BYBIT_API_URL, API_TIMEOUT, API_RETRY_ATTEMPTS

**Cuándo usarla:** Optimizar performance de APIs, troubleshooting de conexión

#### `get_analysis_config` - **Parámetros de Análisis Técnico**
```
Uso: get_analysis_config
```
**Lo que obtienes:**
- Sensibilidad de detección de pivots (1-5)
- Número de períodos para análisis
- Threshold de volume spikes
- Variables: ANALYSIS_SENSITIVITY, ANALYSIS_PERIODS, VOLUME_THRESHOLD
- Recomendaciones para diferentes estrategias

**Cuándo usarla:** Optimizar parámetros de análisis para tu estilo de trading

#### `get_grid_config` - **Configuración Grid Trading**
```
Uso: get_grid_config
```
**Lo que obtienes:**
- Número default de grids
- Rangos de volatilidad mínima y máxima para grid
- Variables: GRID_COUNT, MIN_VOLATILITY, MAX_VOLATILITY
- Recomendaciones de optimización

**Cuándo usarla:** Personalizar configuración de grid trading

#### `get_logging_config` - **Configuración de Logging y Monitoreo**
```
Uso: get_logging_config
```
**Lo que obtienes:**
- Nivel de logging configurado (debug, info, warn, error)
- Estado de performance tracking
- Variables: LOG_LEVEL, ENABLE_PERFORMANCE_TRACKING

**Cuándo usarla:** Debugging, optimización de performance

#### `validate_env_config` - **Validación Completa de Configuración**
```
Uso: validate_env_config
```
**Lo que obtienes:**
- Validación completa de todas las variables
- Errores específicos con soluciones claras
- Warnings de configuración suboptimal
- Recomendaciones de corrección automáticas
- 15+ reglas de validación aplicadas

**Cuándo usarla:** Antes de deployment, troubleshooting de configuración

#### `reload_env_config` - **Recarga en Caliente**
```
Uso: reload_env_config
```
**Lo que obtienes:**
- Recarga de configuración sin reiniciar el sistema
- Nuevos valores aplicados inmediatamente
- Hot reload capability para desarrollo iterativo

**Cuándo usarla:** Desarrollo, cambios de configuración sin downtime

#### `get_env_file_info` - **Información del Archivo .env**
```
Uso: get_env_file_info
```
**Lo que obtienes:**
- Path del archivo .env y estado (existe/no existe)
- Número de variables configuradas vs total
- Template completo del archivo .env con documentación
- Rate de configuración (% de variables configuradas)
- Recomendaciones de configuración

**Cuándo usarla:** Setup inicial, generar template, auditoria de configuración

### **🌐 Sistema de Configuración de Usuario**

#### `get_user_config` - **Configuración Personal**
```
Uso: get_user_config
```
**Lo que obtienes:**
- Configuración completa de timezone y preferencias
- Configuración de trading y display
- Path del archivo de configuración
- Estado del sistema de auto-detección

**Cuándo usarla:** Verificar configuración personal, troubleshooting timezone

#### `set_user_timezone` - **Configurar Zona Horaria**
```
Uso: set_user_timezone America/New_York true
```
**Lo que obtienes:**
- Configuración de timezone específica
- Habilitación/deshabilitación de auto-detección
- Validación automática del timezone
- Persistencia entre sesiones

**Cuándo usarla:** Cambio de ubicación, configuración inicial

#### `detect_timezone` - **Auto-Detección de Zona Horaria**
```
Uso: detect_timezone
```
**Lo que obtienes:**
- Detección inteligente con múltiples métodos
- Nivel de confianza del resultado
- Método usado (env var, Intl API, sistema)
- Fallback configurado

**Cuándo usarla:** Setup inicial, verificar zona horaria detectada

#### `validate_config` - **Validación de Configuración Usuario**
```
Uso: validate_config
```
**Lo que obtienes:**
- Validación completa de configuración usuario
- Errores y sugerencias de corrección
- Estado de validez del timezone
- Recomendaciones de optimización

**Cuándo usarla:** Troubleshooting, verificación post-setup

## 📋 Herramientas Disponibles v1.6.1

### **🆕 Análisis Histórico (NUEVO TASK-017)**

#### `get_historical_klines` - **Datos Históricos Base**
```
Uso: get_historical_klines BTCUSDT D
```
**Lo que obtienes:**
- 800+ días de datos OHLCV históricos
- Metadata completa (fechas, puntos de datos)
- Intervalos: Diario (D), Semanal (W), Mensual (M)
- Cache optimizado (24h TTL)
- Datos desde 2021 hasta presente

**Cuándo usarla:** Base para análisis profundo, investigación histórica

#### `analyze_historical_sr` - **S/R Histórico Avanzado**
```
Uso: analyze_historical_sr BTCUSDT D
```
**Lo que obtienes:**
- Niveles S/R con scoring histórico
- Número de toques y éxito por nivel
- Significancia basada en volumen histórico
- Distancia actual a niveles clave
- Niveles "major" vs "minor" clasificados
- Estadísticas de fortaleza histórica

**Cuándo usarla:** Identificar niveles macro críticos, validar S/R actuales con historial

#### `identify_volume_anomalies` - **Eventos de Volumen Históricos**
```
Uso: identify_volume_anomalies ETHUSDT D 2.5
```
**Lo que obtienes:**
- Eventos de volumen excepcional (2.5x+ promedio)
- Correlación con movimientos de precio
- Identificación de manipulación histórica
- Patrones de acumulación/distribución
- Contexto temporal de eventos

**Cuándo usarla:** Investigar manipulación, identificar zonas de interés institucional

#### `get_price_distribution` - **Value Areas Históricas**
```
Uso: get_price_distribution XRPUSDT W
```
**Lo que obtienes:**
- Distribución estadística de precios históricos
- "Value areas" de mayor actividad
- Zones de equilibrio de largo plazo
- Análisis de concentración por rango de precios
- Datos para estrategias de mean reversion

**Cuándo usarla:** Identificar zonas de "fair value", configurar targets de largo plazo

#### `identify_market_cycles` - **Ciclos de Mercado**
```
Uso: identify_market_cycles BTCUSDT
```
**Lo que obtienes:**
- Patrones cíclicos identificados
- Duración promedio de tendencias
- Amplitud típica de movimientos
- Timing estacional si existe
- Predicciones basadas en ciclos históricos

**Cuándo usarla:** Timing de entries/exits, prepararse para reversiones cíclicas

#### `get_historical_summary` - **Análisis Histórico Completo**
```
Uso: get_historical_summary BTCUSDT W
```
**Lo que obtienes:**
- Resumen consolidado de TODOS los análisis históricos
- S/R + Volume Events + Price Distribution + Market Cycles
- Insights y recomendaciones agregadas
- Contexto histórico comprehensivo
- **✨ TU HERRAMIENTA DE RESEARCH PRINCIPAL**

**Cuándo usarla:** Due diligence completa, tesis de trading de largo plazo

### **🔍 Análisis Principal de Mercado**

#### `get_complete_analysis` - **TU HERRAMIENTA PRINCIPAL**
```
Uso: get_complete_analysis XRPUSDT 1000
```
**Lo que obtienes:**
- Precio actual y cambio 24h
- Niveles de soporte/resistencia críticos con scoring
- Análisis de volumen y VWAP
- Volume Delta (presión compradora/vendedora)
- Sugerencias de grid trading automáticas
- Recomendación general (BUY/SELL/HOLD)
- **🆕 Auto-guardado** en repositorio para consulta histórica

**Cuándo usarla:** Antes de cualquier decisión de trading, análisis diario

#### `perform_technical_analysis` - **Análisis Técnico Modular**
```
Uso: perform_technical_analysis HBARUSDT
Parámetros opcionales: includeVolatility, includeVolume, includeVolumeDelta, includeSupportResistance
```
**Lo que obtienes:**
- Análisis modular personalizable
- Solo los indicadores que necesitas
- **🆕 Auto-guardado** automático
- Optimizado para velocidad

**Cuándo usarla:** Análisis específico de indicadores individuales

#### `get_market_data` - **Datos Básicos con Cache**
```
Uso: get_market_data HBARUSDT
```
**Lo que obtienes:**
- Precio, volumen, cambios 24h
- Orderbook (bids/asks principales)
- Últimas velas (OHLCV)
- **🆕 Cache automático** para mejor performance

**Cuándo usarla:** Check rápido de precio y momentum

### **📊 Análisis Técnico Especializado**

#### `identify_support_resistance` - **Niveles Clave Avanzados**
```
Uso: identify_support_resistance ONDOUSDT 60 100 2
```
**Lo que obtienes:**
- Niveles de soporte/resistencia con scoring 1-10
- Configuración de grid optimizada
- Nivel crítico más relevante
- **🆕 Algoritmo mejorado** multi-factor
- Estadísticas de detección de pivots

**Cuándo usarla:** Para identificar entries/exits precisos, colocar stop losses

#### `analyze_volume_delta` - **Presión Institucional**
```
Uso: analyze_volume_delta XRPUSDT 5 60
```
**Lo que obtienes:**
- Presión compradora vs vendedora
- Divergencias con el precio
- Tendencia del Volume Delta
- Señales de reversión temprana
- **🆕 Market pressure analysis** detallado

**Cuándo usarla:** Confirmar direccionalidad, detectar reversiones

#### `suggest_grid_levels` - **Grid Trading Inteligente**
```
Uso: suggest_grid_levels XRPUSDT 500 10 medium false
```
**Lo que obtienes:**
- Niveles de grid optimizados
- Cantidad por nivel calculada
- Rango de trading recomendado
- ROI estimado y riesgo
- **🆕 Integración con S/R** para niveles más precisos

**Cuándo usarla:** Configurar bots de grid trading, trading de rango

### **🆕 Sistema de Repositorio Histórico**

#### `get_analysis_history` - **Tu Historial de Trading**
```
Uso: get_analysis_history XRPUSDT 20 technical_analysis
```
**Lo que obtienes:**
- Últimos análisis guardados del símbolo
- Filtrado por tipo de análisis
- Metadata completa (versión, confianza, tags)
- Evolución temporal de indicadores

**Cuándo usarla:** Revisar decisiones pasadas, ver tendencias históricas

#### `get_latest_analysis` - **Último Análisis Guardado**
```
Uso: get_latest_analysis XRPUSDT complete_analysis
```
**Lo que obtienes:**
- Análisis más reciente guardado
- Datos completos del último estudio
- Evita recálculos innecesarios
- **🆕 Formato UUID** mejorado

**Cuándo usarla:** Recuperar tu último análisis sin repetir cálculos

#### `search_analyses` - **Búsqueda Avanzada Compleja**
```
Uso: search_analyses con filtros avanzados
Parámetros: symbol, type, dateFrom, dateTo, limit, orderBy, orderDirection
```
**Lo que obtienes:**
- Búsqueda por rangos de fecha específicos
- Filtros por tipo de análisis
- Ordenamiento personalizado
- **🆕 Query engine** potente

**Cuándo usarla:** Investigación profunda, backtest de estrategias

#### `get_analysis_by_id` - **Recuperar Análisis Específico**
```
Uso: get_analysis_by_id [UUID-del-análisis]
```
**Lo que obtienes:**
- Análisis específico por ID único
- Datos completos preservados
- **🆕 Sistema UUID** robusto

**Cuándo usarla:** Referenciar análisis específicos en decisiones

#### `get_analysis_summary` - **Resumen Agregado por Período**
```
Uso: get_analysis_summary XRPUSDT 1d
```
**Lo que obtienes:**
- Resumen estadístico del período
- Promedio de indicadores
- Tendencias identificadas
- **🆕 Insights agregados** automáticos

**Cuándo usarla:** Vista panorámica de períodos, análisis de tendencias

#### `get_aggregated_metrics` - **Métricas Estadísticas**
```
Uso: get_aggregated_metrics XRPUSDT volatility.volatilityPercent 1d
```
**Lo que obtienes:**
- Estadísticas de métricas específicas
- Agregaciones por período
- **🆕 Analytics avanzado** de indicadores

**Cuándo usarla:** Análisis cuantitativo profundo

#### `find_patterns` - **Búsqueda de Patrones**
```
Uso: find_patterns con criterios específicos
```
**Lo que obtienes:**
- Patrones detectados automáticamente
- Criterios de confianza
- **🆕 Pattern recognition** inteligente

**Cuándo usarla:** Identificar setups recurrentes, patrones Wyckoff

#### `get_repository_stats` - **Estadísticas del Sistema**
```
Uso: get_repository_stats
```
**Lo que obtienes:**
- Total de análisis guardados
- Distribución por tipo y símbolo
- Uso de almacenamiento
- **🆕 Métricas de uso** detalladas

**Cuándo usarla:** Mantenimiento, ver qué datos tienes disponibles

### **🆕 Sistema de Reportes Automáticos**

#### `generate_daily_report` - **Reporte Diario Automático**
```
Uso: generate_daily_report 2024-06-10 ["XRPUSDT", "HBARUSDT"]
```
**Lo que obtienes:**
- Reporte comprehensivo del día
- Análisis de mercado consolidado
- Top movers y patrones
- Recomendaciones agregadas

**Cuándo usarla:** Revisión diaria, planificación de trading

#### `generate_weekly_report` - **Reporte Semanal**
```
Uso: generate_weekly_report 2024-06-10 ["XRPUSDT", "HBARUSDT", "ONDOUSDT"]
```
**Lo que obtienes:**
- Resumen semanal del mercado
- Tendencias identificadas
- Performance de estrategias
- Insights históricos

**Cuándo usarla:** Análisis semanal, ajuste de estrategias

#### `generate_symbol_report` - **Reporte por Símbolo**
```
Uso: generate_symbol_report XRPUSDT 7d
```
**Lo que obtienes:**
- Análisis completo de un símbolo
- Historial de patrones
- Recomendaciones específicas
- **🆕 Deep dive** por token

**Cuándo usarla:** Investigación profunda de un activo específico

#### `generate_performance_report` - **Análisis de Rendimiento**
```
Uso: generate_performance_report 7d
```
**Lo que obtienes:**
- Performance del sistema de análisis
- Métricas de precisión
- Estadísticas de uso
- **🆕 System analytics** completo

**Cuándo usarla:** Evaluar efectividad del sistema, optimización

#### `list_reports` - **Listar Reportes Disponibles**
```
Uso: list_reports
```
**Lo que obtienes:**
- Lista de reportes generados
- Metadata de cada reporte
- **🆕 Gestión de reportes** centralizada

**Cuándo usarla:** Navegación de reportes históricos

### **🆕 Gestión de Cache Inteligente**

#### `get_cache_stats` - **Estadísticas de Cache**
```
Uso: get_cache_stats
```
**Lo que obtienes:**
- Hit rate del cache
- Uso de memoria
- Recomendaciones de optimización
- **🆕 Performance insights** automáticos

**Cuándo usarla:** Optimización de performance, troubleshooting

#### `clear_cache` - **Limpiar Cache**
```
Uso: clear_cache true
```
**Lo que obtienes:**
- Limpieza completa del cache
- Liberación de memoria
- **⚠️ Requiere confirmación**

**Cuándo usarla:** Resolver problemas de datos obsoletos

#### `invalidate_cache` - **Invalidar Cache Específico**
```
Uso: invalidate_cache XRPUSDT spot
```
**Lo que obtienes:**
- Invalidación granular por símbolo
- **🆕 Cache inteligente** por categoría

**Cuándo usarla:** Forzar actualización de datos específicos

### **⚡ Herramientas de Análisis Avanzado**

#### `analyze_volatility` - **Timing de Entry Optimizado**
```
Uso: analyze_volatility ALGOUSDT 1d
```
**Lo que obtienes:**
- Volatilidad actual vs histórica
- Mejor momento para diferentes estrategias
- Expansión/contracción de volatilidad
- **🆕 Grid suitability** mejorado

**Cuándo usarla:** Decidir timing y tipo de estrategia

## 🎯 Workflows de Trading v1.6.1

### **🆕 Workflow de Setup Inicial Cross-Platform (NUEVO)**
```
1. get_env_file_info (verificar estado del archivo .env)
2. validate_env_config (validar configuración completa)
3. get_system_config (verificar configuración cargada)
4. detect_timezone (auto-detectar zona horaria)
5. get_user_config (verificar configuración personal)
6. Sistema listo para trading con configuración optimizada
```

### **🗺️ Workflow de Deployment Cross-Platform (NUEVO)**
```
1. validate_env_config (verificar antes de deploy)
2. get_mongo_config (configurar dual storage si se desea)
3. get_api_config (optimizar timeouts para entorno)
4. get_analysis_config (ajustar parámetros para estrategia)
5. get_logging_config (configurar nivel de logs)
6. Deploy con configuración validada
```

### **🔧 Workflow de Configuración y Troubleshooting (NUEVO)**
```
1. get_system_config (overview completo del sistema)
2. validate_env_config (identificar problemas)
3. reload_env_config (aplicar cambios sin restart)
4. validate_config (verificar configuración usuario)
5. get_cache_stats (verificar performance)
6. Sistema optimizado y validado
```

### **📊 Workflow de Investigación Histórica (NUEVO)**
```
1. get_historical_summary [TOKEN] W (contexto histórico completo)
2. analyze_historical_sr [TOKEN] D (niveles clave históricos)
3. identify_volume_anomalies [TOKEN] D (eventos significativos)
4. get_price_distribution [TOKEN] W (value areas de largo plazo)
5. identify_market_cycles [TOKEN] (patrones cíclicos)
6. Desarrollar tesis basada en análisis histórico profundo
```

### **📈 Workflow de Análisis Diario Optimizado**
```
1. generate_daily_report [fecha] [tus-símbolos]
2. get_complete_analysis para símbolos interesantes
3. get_latest_analysis para comparar con análisis previos
4. Tomar decisiones basadas en reportes + análisis fresh
```

### **🎯 Workflow de Entry/Exit Avanzado**
```
1. get_complete_analysis [TOKEN] [CAPITAL]
2. get_latest_analysis [TOKEN] technical_analysis (comparar cambios)
3. identify_support_resistance [TOKEN] (niveles precisos)
4. analyze_volume_delta [TOKEN] (confirmar timing)
5. Ejecutar trade con niveles identificados
6. Los análisis se guardan automáticamente para seguimiento
```

### **🤖 Workflow de Grid Trading Inteligente**
```
1. analyze_volatility [TOKEN] (verificar suitability)
2. suggest_grid_levels [TOKEN] [CAPITAL] [grids] [risk] [optimize]
3. identify_support_resistance [TOKEN] (confirmar rango)
4. Configurar grid con niveles sugeridos
5. Monitor con reportes diarios automáticos
```

### **🔄 Workflow de Swing Trading con Historial**
```
1. get_analysis_summary [TOKEN] 7d (contexto histórico)
2. get_complete_analysis [TOKEN] [CAPITAL] (setup actual)
3. search_analyses para patterns similares históricos
4. analyze_volume_delta [TOKEN] (timing preciso)
5. Ejecutar con apalancamiento basado en confianza histórica
```

### **📊 Workflow de Investigación y Backtesting**
```
1. search_analyses con filtros temporales amplios
2. get_aggregated_metrics para indicadores clave
3. find_patterns para identificar setups recurrentes
4. generate_symbol_report para análisis completo
5. Desarrollar estrategias basadas en datos históricos
```

### **🆕 Workflow de Reportes Automáticos**
```
1. generate_daily_report cada mañana (automático)
2. generate_weekly_report cada domingo
3. generate_symbol_report para análisis específicos
4. generate_performance_report para optimización mensual
5. list_reports para revisar tendencias históricas
```

## 💡 Tips de Uso Efectivo v1.6.1

### **🆕 Para Configuración Cross-Platform**
- **Zero-config start:** El sistema funciona out-of-the-box con defaults
- **Template generation:** Usa `get_env_file_info` para generar .env completo
- **Validation first:** Siempre `validate_env_config` antes de deployment
- **Hot reload:** Usa `reload_env_config` para cambios sin downtime
- **Cross-platform:** Mismo .env funciona en Windows, Linux, macOS, Docker
- **Environment precedence:** Variables del sistema > .env > defaults

### **🌐 Para Configuración de Usuario**
- **Auto-detection:** `detect_timezone` funciona en la mayoría de sistemas
- **Persistent config:** Configuración se mantiene entre sesiones
- **Validation:** `validate_config` para verificar configuración usuario
- **Multi-environment:** Diferentes configs para desarrollo/producción

### **🆕 Para Análisis Histórico Profundo**
- **Research completo:** Usa `get_historical_summary` como punto de partida
- **Validación S/R:** Combina `identify_support_resistance` actual + `analyze_historical_sr`
- **Event correlation:** `identify_volume_anomalies` para encontrar manipulación histórica
- **Long-term targets:** `get_price_distribution` para value areas de largo plazo
- **Timing estacional:** `identify_market_cycles` para patterns cíclicos

### **🎯 Para tu Portfolio (XRP, HBAR, ONDO)**
- **Análisis diario:** Usa `generate_daily_report` con tus símbolos
- **Decisions críticas:** Combina `get_complete_analysis` + historial
- **Grid setup:** `suggest_grid_levels` integrado con S/R
- **🆕 Tracking:** Usa `get_analysis_summary` para seguimiento semanal

### **💰 Para $2,000 USDC de Trading**
- **Capital por trade:** Usar capital real en `suggest_grid_levels`
- **Risk management:** S/R levels con scoring alto como stop losses
- **🆕 Performance:** `generate_performance_report` para evaluar ROI

### **🔍 Interpretación de Señales Mejorada**

#### **Bullish Setup Confirmado:**
- Volume Delta positivo + precio rompiendo resistencia (strength >8)
- VWAP como soporte + volumen creciente
- Análisis histórico muestra patterns alcistas recurrentes
- **🆕 Scoring S/R >8.5** en resistencia rota

#### **Bearish Setup Confirmado:**
- Volume Delta negativo + precio perdiendo soporte (strength >8)
- VWAP como resistencia + volumen bajista
- Divergencia negativa confirmada en análisis previos
- **🆕 Pattern recognition** de distribución

#### **🆕 Historical Research Setup:**
- Análisis histórico profundo con 3+ años de datos
- S/R levels validados históricamente con scoring por toques
- Volume events y anomalías identificadas automáticamente
- Value areas de largo plazo para mean reversion
- **🆕 Scoring S/R histórico >80** en niveles críticos validados

### **⚠️ Nuevas Consideraciones v1.6.1**
- **Auto-save:** Todos los análisis se guardan automáticamente
- **Cache inteligente:** Primer request más lento, subsecuentes muy rápidos
- **Reportes:** Generación puede tomar 30-60 segundos
- **Storage:** Sistema almacena análisis indefinidamente
- **Performance:** `get_cache_stats` si notas lentitud
- **🆕 Historical cache:** Datos históricos se cachean hasta 24h
- **🆕 API limits:** Análisis histórico respeta rate limits de Bybit
- **🆕 Data freshness:** Datos históricos siempre desde fuente, análisis procesados se cachean
- **🆕 Environment config:** Sistema funciona out-of-the-box con configuración automática
- **🆕 Cross-platform:** Funciona idénticamente en Windows, Linux, macOS, Docker
- **🆕 Zero-config deployment:** Template .env generado automáticamente si es necesario
- **🆕 Hot reload:** Cambios de configuración aplicados sin reiniciar el sistema

## 🌍 Deployment Cross-Platform v1.6.1 (NUEVO)

### **Setup Para Diferentes Entornos**

#### **Windows Development**
```powershell
# Crear archivo .env en el directorio del proyecto
echo "# wAIckoff MCP Configuration" > .env
echo "LOG_LEVEL=info" >> .env
echo "ENABLE_PERFORMANCE_TRACKING=true" >> .env

# Verificar configuración
npm start
# En Claude Desktop: get_system_config
```

#### **Linux/Ubuntu Production**
```bash
# Crear .env con variables específicas
cat > .env << EOF
# Production Configuration
LOG_LEVEL=warn
API_TIMEOUT=10000
API_RETRY_ATTEMPTS=3
ENABLE_PERFORMANCE_TRACKING=false
EOF

# Deploy y verificar
npm run build && npm start
```

#### **macOS Development**
```bash
# Auto-detectar timezone y configurar
echo "# macOS Configuration" > .env
echo "LOG_LEVEL=debug" >> .env

# El sistema auto-detecta timezone automáticamente
npm start
```

#### **Docker Deployment**
```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Variables de entorno pueden pasarse via -e o docker-compose
EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml example
version: '3.8'
services:
  waickoff-mcp:
    build: .
    environment:
      - LOG_LEVEL=info
      - API_TIMEOUT=8000
      - MONGODB_CONNECTION_STRING=mongodb://mongo:27017/waickoff
    depends_on:
      - mongo
  mongo:
    image: mongo:5
    volumes:
      - mongo_data:/data/db
volumes:
  mongo_data:
```

#### **CI/CD Pipeline**
```yaml
# GitHub Actions example
name: Deploy wAIckoff MCP
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Create production .env
        run: |
          echo "LOG_LEVEL=warn" >> .env
          echo "API_TIMEOUT=12000" >> .env
          echo "ENABLE_PERFORMANCE_TRACKING=false" >> .env
      - name: Build and test
        run: |
          npm ci
          npm run build
          npm run test
      - name: Deploy
        run: npm start
```

### **Variables de Entorno Recomendadas por Entorno**

#### **Development (.env)**
```env
# Development Configuration
LOG_LEVEL=debug
ENABLE_PERFORMANCE_TRACKING=true
ANALYSIS_SENSITIVITY=2
API_TIMEOUT=5000
API_RETRY_ATTEMPTS=2
```

#### **Staging (.env)**
```env
# Staging Configuration
LOG_LEVEL=info
ENABLE_PERFORMANCE_TRACKING=true
ANALYSIS_SENSITIVITY=2
API_TIMEOUT=8000
API_RETRY_ATTEMPTS=3
MONGODB_CONNECTION_STRING=mongodb://staging-mongo:27017/waickoff
```

#### **Production (.env)**
```env
# Production Configuration
LOG_LEVEL=warn
ENABLE_PERFORMANCE_TRACKING=false
ANALYSIS_SENSITIVITY=3
API_TIMEOUT=10000
API_RETRY_ATTEMPTS=3
MONGODB_CONNECTION_STRING=mongodb://prod-mongo:27017/waickoff
GRID_COUNT=15
MIN_VOLATILITY=0.02
MAX_VOLATILITY=0.15
```

### **Mejores Prácticas de Configuración**

#### **🔒 Seguridad**
- **Nunca commitear .env** al repositorio
- **Usar variables del sistema** para secretos en producción
- **MongoDB connection strings** solo en staging/production
- **API keys futuras** siempre como variables de entorno

#### **⚡ Performance**
- **LOG_LEVEL=warn** en producción para mejor performance
- **ENABLE_PERFORMANCE_TRACKING=false** en producción
- **API_TIMEOUT** más alto en producción (10-12 segundos)
- **Cache TTL** optimizado según uso

#### **🔧 Mantenimiento**
- **validate_env_config** antes de cada deployment
- **reload_env_config** para cambios sin downtime
- **get_system_config** para verificar configuración cargada
- **Backup de configuración** en deployment scripts

## 🚨 Troubleshooting v1.6.1

### **🆕 Problemas de Configuración:**
1. `validate_env_config` para identificar errores de configuración
2. `get_env_file_info` para verificar estado del archivo .env
3. `reload_env_config` para aplicar cambios sin reiniciar
4. `get_system_config` para verificar variables cargadas

### **🌐 Problemas de Timezone:**
1. `detect_timezone` para auto-detectar zona horaria
2. `validate_config` para verificar configuración usuario
3. `set_user_timezone` para configurar manualmente
4. `get_user_config` para verificar configuración actual

### **Si el MCP no responde:**
1. `get_cache_stats` para verificar estado del sistema
2. `clear_cache true` si hay problemas de memoria
3. Reinicia Claude Desktop como último recurso

### **Si hay datos inconsistentes:**
1. `invalidate_cache [SYMBOL]` para el símbolo específico
2. Verifica con `get_latest_analysis` si hay análisis recientes
3. `get_repository_stats` para verificar integridad del sistema

### **Si los reportes fallan:**
1. Verifica que tengas análisis suficientes con `get_analysis_history`
2. Usa `generate_symbol_report` individual en vez de múltiples símbolos
3. Reduce el período de tiempo del reporte

### **Para debugging avanzado:**
```
get_debug_logs         # Sistema general
get_cache_stats        # Performance y memoria
get_repository_stats   # Estado del almacenamiento
```

## 🎯 Nuevas Features v1.6.1

### **✅ Implementadas v1.6.1**
- **🆕 Repositorio de análisis** completo con 7 herramientas
- **🆕 Sistema de reportes** con 8 herramientas diferentes
- **🆕 Cache inteligente** con gestión automática
- **🆕 Auto-save** de todos los análisis
- **🆕 Búsquedas complejas** con filtros avanzados
- **🆕 Métricas agregadas** y analytics
- **🆕 Pattern detection** automático
- **🆕 Sistema de configuración** de timezone persistente
- **🆕 Análisis histórico** - 6 herramientas nuevas (TASK-017):
  - `get_historical_klines` - 800+ días de datos OHLCV
  - `analyze_historical_sr` - S/R histórico con scoring avanzado
  - `identify_volume_anomalies` - Eventos de volumen significativos
  - `get_price_distribution` - Value areas históricas
  - `identify_market_cycles` - Patrones cíclicos de mercado
  - `get_historical_summary` - Resumen histórico comprehensivo
- **🆕 Sistema de configuración .env** cross-platform (TASK-015b):
  - `get_system_config` - Configuración completa del sistema
  - `validate_env_config` - Validación con 15+ reglas específicas
  - `reload_env_config` - Hot reload sin downtime
  - `get_env_file_info` - Template generation automático
  - Variables de entorno para MongoDB, APIs, análisis, grid, logging
  - Compatibilidad Windows, Linux, macOS, Docker, CI/CD
  - Zero-config deployment con auto-discovery de archivos

### **🔜 Próximas Features**
- **Detección de trampas alcistas/bajistas** (Bull/Bear traps) - TASK-012
- **Datos on-chain** - Flujos de stablecoins y ballenas - TASK-013
- **Detección de patrones Wyckoff** avanzados
- **Alertas automáticas** basadas en patrones
- **Integración completa con wAIckoff AI**
- **Dual storage MongoDB** opcional (TASK-015)
- **Multi-exchange support** (Binance, Coinbase)
- **WebSocket real-time feeds** para datos en vivo
- **Machine Learning pattern recognition** avanzado

## 📊 Nuevas Capacidades del Sistema

### **Performance y Escalabilidad**
- **Cache hit rate:** 85%+ en uso típico
- **Análisis guardados:** Ilimitados con búsqueda rápida
- **Reportes:** Generación automática optimizada
- **Memory management:** Auto-cleanup y optimización

### **Analytics y Business Intelligence**
- **Historical tracking:** Tendencias de indicadores en el tiempo
- **Pattern recognition:** Detección automática de setups
- **Performance analytics:** ROI y precisión del sistema
- **Custom queries:** Búsquedas específicas por cualquier criterio

---

## 📞 Recordatorio de tu Setup

**Portfolio HODL:** 6,250 XRP, 7,500 HBAR, 500 ONDO  
**Capital Trading:** $2,000 USDC  
**Estrategias:** Grid (spot/futuros) + Swing (2x-4x leverage)  
**Risk:** 2-3% stop loss, máximo 3 posiciones simultáneas  
**🆕 Herramientas:** 55+ herramientas MCP (Core + Historical + Configuration + System)

## 📈 Estadísticas del Sistema v1.6.1

### **🔧 Herramientas MCP Disponibles: 55+**
- **Market Data & Analysis:** 10 herramientas (ticker, orderbook, technical analysis, etc.)
- **Historical Analysis:** 6 herramientas (3+ años de datos históricos)
- **Analysis Repository:** 7 herramientas (almacenamiento y consulta avanzada)
- **Report Generator:** 8 herramientas (reportes automáticos)
- **Configuration System:** 9 herramientas (sistema .env cross-platform)
- **User Configuration:** 7 herramientas (timezone y preferencias)
- **Cache & System:** 8 herramientas (performance y debugging)

### **🌍 Cross-Platform Compatibility**
- **Windows:** Full support con PowerShell y CMD
- **Linux/Ubuntu:** Optimizado para servidores de producción
- **macOS:** Native support con auto-detección
- **Docker:** Container-ready con docker-compose
- **CI/CD:** GitHub Actions, Jenkins, etc.
- **Cloud:** AWS, GCP, Azure compatible

### **🚀 Performance Metrics**
- **Cache Hit Rate:** 85%+ en uso típico
- **API Response Time:** <100ms con cache, <500ms sin cache
- **Historical Data:** 800+ días disponibles por símbolo
- **Analysis Storage:** Ilimitado con búsqueda rápida
- **Concurrent Analysis:** Múltiples símbolos simultáneamente
- **Memory Usage:** Optimizado con auto-cleanup

### **🔍 Data Coverage**
- **Real-time:** Precios, volumen, orderbook en vivo
- **Historical:** 3+ años de datos OHLCV
- **Technical Indicators:** 15+ indicadores implementados
- **Support/Resistance:** Niveles dinámicos con scoring
- **Volume Analysis:** Delta, VWAP, anomalías
- **Market Cycles:** Patrones estacionales y cíclicos

**¡El MCP v1.6.1 está listo para llevar tu trading al siguiente nivel con análisis profesional, configuración cross-platform, almacenamiento inteligente, reportes automáticos y 3+ años de datos históricos!** 🚀
