# 📊 Sistema de Registro de Trades - Master Trading Log

## 📈 Estructura del Excel Trading System

### **HOJA 1: Active_Trades**
| Campo | Descripción | Formato |
|-------|-------------|---------|
| Trade_ID | ID único del trade | T001, T002... |
| Date_Time | Fecha y hora de entrada | YYYY-MM-DD HH:MM:SS |
| Symbol | Símbolo trading | BTCUSDT, XRPUSDT |
| Action | Tipo de operación | BUY/SELL/SHORT/COVER |
| Entry_Price | Precio de entrada | Decimal (8 decimales) |
| Quantity | Cantidad operada | Decimal |
| Capital_USD | Capital usado | USD con 2 decimales |
| Stop_Loss | Nivel de stop loss | Precio |
| Take_Profit_1 | Primer objetivo | Precio |
| Take_Profit_2 | Segundo objetivo | Precio |
| Take_Profit_3 | Tercer objetivo | Precio |
| Current_Price | Precio actual (manual update) | Precio |
| Unrealized_P&L | P&L no realizado | USD |
| Unrealized_% | P&L % no realizado | Porcentaje |
| Status | Estado actual | OPEN/PARTIAL/CLOSED |
| Risk_Amount | Riesgo en USD | USD |
| Risk_% | Riesgo % del capital | Porcentaje |

### **HOJA 2: Closed_Trades**
| Campo | Descripción | Formato |
|-------|-------------|---------|
| Trade_ID | ID único del trade | T001, T002... |
| Entry_Date | Fecha entrada | YYYY-MM-DD HH:MM:SS |
| Exit_Date | Fecha salida | YYYY-MM-DD HH:MM:SS |
| Symbol | Símbolo | BTCUSDT, etc |
| Direction | Dirección | LONG/SHORT |
| Entry_Price | Precio entrada | Decimal |
| Exit_Price | Precio salida | Decimal |
| Quantity | Cantidad | Decimal |
| Gross_P&L | P&L bruto | USD |
| Fees | Comisiones totales | USD |
| Net_P&L | P&L neto | USD |
| P&L_% | Retorno % | Porcentaje |
| Duration_Hours | Duración en horas | Número |
| Strategy | Estrategia usada | Grid/Swing/Scalp |
| Win/Loss | Resultado | WIN/LOSS/BE |

### **HOJA 3: Trade_Analysis**
| Campo | Descripción | Formato |
|-------|-------------|---------|
| Trade_ID | ID del trade | T001, T002... |
| SMC_Bias | Sesgo Smart Money | BULLISH/BEARISH/NEUTRAL |
| SMC_Score | Score confluencia SMC | 0-100 |
| Elliott_Phase | Fase Elliott Wave | Wave 1-5, A-C |
| Volume_Delta | Delta de volumen | POSITIVE/NEGATIVE |
| Wyckoff_Phase | Fase Wyckoff | Accumulation/Distribution |
| Confluence_Score | Score total confluencia | 0-100 |
| Setup_Quality | Calidad del setup | PREMIUM/STANDARD/BASIC |
| Entry_Reasoning | Razón de entrada | Texto descriptivo |
| MCP_Report_Link | Link al análisis MCP | Path al archivo |
| Screenshot | Path screenshot | Path al archivo |

### **HOJA 4: Statistics**
| Métrica | Valor | Fórmula |
|---------|-------|---------|
| Total_Trades | Número | COUNT(trades) |
| Open_Trades | Número | COUNT(status=OPEN) |
| Win_Rate | % | WINS/TOTAL*100 |
| Average_Win | USD | AVG(winning trades) |
| Average_Loss | USD | AVG(losing trades) |
| Profit_Factor | Ratio | Total_Wins/Total_Losses |
| Sharpe_Ratio | Ratio | (Returns-RiskFree)/StdDev |
| Max_Drawdown | % | Mayor pérdida desde máximo |
| Best_Trade | USD | MAX(P&L) |
| Worst_Trade | USD | MIN(P&L) |
| Average_Duration | Horas | AVG(duration) |
| ROI_Total | % | Net_P&L/Initial_Capital*100 |

### **HOJA 5: Monthly_Summary**
| Mes | Trades | Wins | Losses | Win_Rate | Gross_P&L | Fees | Net_P&L | ROI_% |
|-----|--------|------|--------|----------|-----------|------|---------|-------|
| 2025-06 | 0 | 0 | 0 | 0% | $0.00 | $0.00 | $0.00 | 0% |

### **HOJA 6: Strategy_Performance**
| Strategy | Trades | Win_Rate | Avg_P&L | Total_P&L | Best_R:R | Avg_Duration |
|----------|--------|----------|---------|-----------|----------|--------------|
| Grid Trading | 0 | 0% | $0 | $0 | 0:0 | 0h |
| Swing Trading | 0 | 0% | $0 | $0 | 0:0 | 0h |
| SMC Setups | 0 | 0% | $0 | $0 | 0:0 | 0h |

### **HOJA 7: Symbol_Performance**
| Symbol | Trades | Win_Rate | Total_P&L | Avg_P&L | Best_Trade | Worst_Trade |
|--------|--------|----------|-----------|---------|------------|-------------|
| BTCUSDT | 0 | 0% | $0 | $0 | $0 | $0 |
| XRPUSDT | 0 | 0% | $0 | $0 | $0 | $0 |
| HBARUSDT | 0 | 0% | $0 | $0 | $0 | $0 |

---

## 📝 Guía de Uso del Sistema

### **1. Registro de Nueva Operación:**
```
Comando: "Compré [SYMBOL] a [PRECIO], cantidad [QTY]"
Ejemplo: "Compré XRP a 0.65, cantidad 1000"
```

### **2. Actualización de Trade:**
```
Comando: "Actualizar trade [ID]: [ACCIÓN]"
Ejemplos:
- "Actualizar T001: stop loss movido a 0.64"
- "Actualizar T001: cerré 50% a 0.67"
- "Actualizar T001: stop loss activado"
```

### **3. Consultas de Estado:**
```
- "Estado de trades abiertos"
- "Performance del mes"
- "Estadísticas de XRP"
- "Win rate actual"
```

### **4. Análisis de Setup:**
```
Comando: "Analizar setup [SYMBOL]"
- Ejecuta análisis completo MCP
- Registra scores y confluencias
- Guarda contexto del mercado
```

---

## 🔧 Fórmulas Excel Importantes

### **P&L No Realizado:**
```excel
=(Current_Price - Entry_Price) * Quantity - Fees
```

### **P&L Porcentaje:**
```excel
=((Exit_Price - Entry_Price) / Entry_Price) * 100
```

### **Risk Reward Realizado:**
```excel
=ABS(P&L) / Risk_Amount
```

### **Win Rate:**
```excel
=COUNTIF(Status,"WIN") / COUNTA(Status) * 100
```

### **Profit Factor:**
```excel
=SUMIF(P&L,">0") / ABS(SUMIF(P&L,"<0"))
```

### **Sharpe Ratio (Mensual):**
```excel
=(AVERAGE(Returns) - 0.02/12) / STDEV(Returns)
```

---

## 📊 Dashboard Métricas Clave

### **KPIs Principales:**
1. **Capital Total:** $1,500.00
2. **Capital en Trading:** $0.00
3. **Capital Disponible:** $1,500.00
4. **P&L Total:** $0.00
5. **ROI Total:** 0.00%
6. **Trades Activos:** 0
7. **Win Rate:** N/A
8. **Profit Factor:** N/A

### **Límites de Riesgo:**
- **Max Risk per Trade:** 2-3% ($30-45)
- **Max Open Positions:** 3
- **Max Daily Loss:** 5% ($75)
- **Max Drawdown Alert:** 10% ($150)

---

## 🚀 Próximos Pasos

1. **Copiar estructura** a Excel real
2. **Configurar fórmulas** automáticas
3. **Crear gráficos** de equity curve
4. **Establecer alertas** de riesgo
5. **Vincular con análisis** MCP

---

*Sistema de Trazabilidad v1.0 - wAIckoff MCP Integration*
*Creado: 2025-06-13*
*Por: AI Trading Assistant*