# 🎯 Sistema de Trazabilidad de Trades - wAIckoff MCP

## 📋 Descripción General

Sistema completo de registro, seguimiento y análisis de trades integrado con wAIckoff MCP. Diseñado para mantener un registro detallado de todas las operaciones, calcular métricas de performance y mejorar la toma de decisiones basada en datos históricos.

## 🗂️ Estructura del Sistema

```
reports/
├── trading_log/                        # Sistema principal de trading
│   ├── master_trades_template.csv      # Template CSV para Excel
│   ├── EXCEL_STRUCTURE_GUIDE.md        # Guía completa del Excel
│   ├── TRADE_TEMPLATE.md               # Template para trades individuales
│   ├── COMANDOS_RAPIDOS.md             # Referencia de comandos
│   ├── SYSTEM_STATUS_2025-06-13.md     # Estado actual del sistema
│   ├── trading_log_manager.py          # Script Python (opcional)
│   └── README.md                       # Este archivo
├── statistics/                         # Estadísticas y análisis
│   └── [Reportes de performance]
├── error_logs/                         # Logs de errores
└── [SYMBOL]/                           # Carpetas por símbolo
    └── [Análisis y trades específicos]
```

## 🚀 Inicio Rápido

### 1. **Configurar Excel**
1. Abre Excel/Google Sheets
2. Copia la estructura de `EXCEL_STRUCTURE_GUIDE.md`
3. Configura las fórmulas automáticas
4. Guarda como `master_trades.xlsx`

### 2. **Primer Trade**
```
Usuario: "Compré XRP a 0.65, cantidad 1000"
Sistema: ✅ Trade T001 registrado
         Stop Loss: $0.63 (-3.08%)
         Take Profit 1: $0.67 (+3.08%)
         Risk: $20 (1.33% del capital)
```

### 3. **Consultar Estado**
```
Usuario: "Mostrar trades abiertos"
Usuario: "Performance del día"
Usuario: "Win rate actual"
```

## 📊 Componentes del Sistema

### **1. Master Trades Excel**
- **Hoja 1:** Active_Trades (posiciones abiertas)
- **Hoja 2:** Closed_Trades (historial completo)
- **Hoja 3:** Trade_Analysis (análisis técnico)
- **Hoja 4:** Statistics (métricas globales)
- **Hoja 5:** Monthly_Summary (resumen mensual)
- **Hoja 6:** Strategy_Performance (por estrategia)
- **Hoja 7:** Symbol_Performance (por símbolo)

### **2. Sistema de Reportes**
- Reporte individual por trade
- Análisis MCP vinculado
- Screenshots de entry/exit
- Contexto de mercado guardado

### **3. Métricas Automáticas**
- Win Rate
- Profit Factor
- Sharpe Ratio
- Max Drawdown
- R:R promedio
- Duration promedio

## 🎯 Flujo de Trabajo

### **Entry Process:**
1. Identificar setup con wAIckoff MCP
2. Validar confluencias (Score > 70)
3. Calcular position size y riesgo
4. Ejecutar trade en exchange
5. Registrar en sistema inmediatamente
6. Guardar análisis y contexto

### **Management Process:**
1. Monitorear P&L en tiempo real
2. Actualizar stops según plan
3. Cerrar parciales en targets
4. Documentar cambios importantes

### **Exit Process:**
1. Registrar precio de salida
2. Razón de cierre (TP/SL/Manual)
3. Calcular P&L final
4. Actualizar estadísticas
5. Documentar lecciones aprendidas

## 📈 Comandos Principales

### **Trading:**
- `"Compré [SYMBOL] a [PRECIO], cantidad [QTY]"`
- `"Cerré [SYMBOL] a [PRECIO]"`
- `"Stop loss activado en [SYMBOL]"`

### **Análisis:**
- `"Analizar setup [SYMBOL]"`
- `"Dashboard SMC para [SYMBOL]"`
- `"Trading setup [SYMBOL]"`

### **Performance:**
- `"Mostrar trades abiertos"`
- `"Performance del mes"`
- `"Estadísticas por estrategia"`

## 🔧 Configuración Avanzada

### **Parámetros de Riesgo:**
```python
RISK_CONFIG = {
    'max_risk_per_trade': 0.03,      # 3% máximo
    'max_open_positions': 3,         # 3 trades simultáneos
    'max_daily_loss': 0.05,          # 5% daily stop
    'max_drawdown': 0.10,            # 10% max DD
    'min_risk_reward': 2.0           # Mínimo 1:2
}
```

### **Alertas Automáticas:**
- Drawdown > 7.5% = Warning
- Drawdown > 10% = Stop trading
- Daily loss > 3% = Warning  
- Daily loss > 5% = Stop day

## 📊 Integración con wAIckoff MCP

### **Pre-Trade Analysis:**
```javascript
// 1. Dashboard general
get_smc_dashboard("BTCUSDT")

// 2. Setup específico
get_smc_trading_setup("BTCUSDT", "60", "long")

// 3. Validar confluencias
analyze_smc_confluence_strength("BTCUSDT")
```

### **Trade Documentation:**
- SMC Bias y Score
- Elliott Wave Phase
- Wyckoff Phase
- Volume Delta
- Confluence Score
- Entry reasoning completo

## 📈 Reportes y Análisis

### **Diario:**
- P&L del día
- Trades ejecutados
- Win rate diario
- Cumplimiento de reglas

### **Semanal:**
- Performance por estrategia
- Mejores/peores trades
- Análisis de errores
- Ajustes necesarios

### **Mensual:**
- ROI total
- Estadísticas completas
- Evolución de métricas
- Plan siguiente mes

## 🎯 Mejores Prácticas

1. **Disciplina:** Registrar TODOS los trades
2. **Inmediatez:** Documentar en el momento
3. **Honestidad:** Incluir errores y lecciones
4. **Análisis:** Revisar performance semanalmente
5. **Mejora:** Ajustar basado en datos reales

## 🚀 Próximos Pasos

1. **Crear Excel** con todas las hojas
2. **Configurar fórmulas** automáticas
3. **Primer análisis** de mercado
4. **Ejecutar primer trade** documentado
5. **Establecer rutina** diaria

## 📞 Soporte

- **Documentación:** Este README y archivos .md
- **Comandos:** Ver COMANDOS_RAPIDOS.md
- **Estructura:** Ver EXCEL_STRUCTURE_GUIDE.md
- **Templates:** Ver TRADE_TEMPLATE.md

---

*Sistema de Trazabilidad v1.0*
*Integrado con wAIckoff MCP*
*Creado: 2025-06-13*

**¡Listo para comenzar a tradear con disciplina y datos!** 🚀