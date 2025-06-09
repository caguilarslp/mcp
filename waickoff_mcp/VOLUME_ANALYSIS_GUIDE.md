# Guía de Análisis de Volumen - Bybit MCP v1.1

## 🆕 Nuevas Herramientas de Volumen

### 1. `get_volume_analysis` - Análisis de Volumen Tradicional
Analiza patrones de volumen, detecta anomalías y calcula VWAP.

**Qué proporciona:**
- Volumen promedio y comparaciones
- Detección de picos de volumen (>1.5x promedio)
- VWAP (Volume-Weighted Average Price)
- Tendencias de volumen

**Uso ideal:**
- Identificar momentos de alto interés institucional
- Confirmar breakouts con volumen
- Determinar si el precio está sobrevalorado (por encima de VWAP)

### 2. `get_volume_delta` - Presión Compradora vs Vendedora
Calcula la diferencia entre volumen de compra y venta estimado.

**Qué proporciona:**
- Delta instantáneo (compras - ventas)
- Delta acumulativo (tendencia general)
- Detección de divergencias precio/volumen
- Análisis de presión del mercado

**Uso ideal:**
- Identificar acumulación/distribución oculta
- Detectar reversiones antes de que ocurran
- Confirmar la fuerza de una tendencia

## 📊 Interpretación para Trading

### Volume Analysis:
- **Picos de volumen + precio sube** = Confirmación alcista
- **Picos de volumen + precio baja** = Confirmación bajista
- **Precio por encima de VWAP** = Posible resistencia
- **Precio por debajo de VWAP** = Posible soporte

### Volume Delta:
- **Delta positivo creciente** = Acumulación (compras)
- **Delta negativo creciente** = Distribución (ventas)
- **Divergencia alcista** = Precio baja pero delta sube (reversión alcista próxima)
- **Divergencia bajista** = Precio sube pero delta baja (reversión bajista próxima)

## 🎯 Para Grid Trading

### Señales de ENTRADA:
1. **Delta positivo** + **Volumen > promedio** = Buen momento para iniciar grid
2. **Precio cerca de VWAP** = Zona de equilibrio ideal para grids
3. **Sin divergencias** = Tendencia saludable para grids

### Señales de SALIDA/PRECAUCIÓN:
1. **Divergencia detectada** = Posible reversión, cerrar grids
2. **Delta muy negativo** = Presión vendedora fuerte
3. **Volumen < 50% promedio** = Baja liquidez, grids menos efectivos

## 🔧 Ejemplos de Uso

```javascript
// Análisis completo antes de grid
1. get_volume_analysis("XRPUSDT", "60", 24)  // Últimas 24 horas
2. get_volume_delta("XRPUSDT", "5", 60)      // Últimos 300 minutos
3. Si ambos son positivos → suggest_grid_levels()
```

## ⚠️ Limitaciones Actuales

- **Sin API Key**: Los cálculos de delta son aproximaciones basadas en la posición del cierre
- **Con API Key** (futuro): Acceso a trades reales para delta exacto

## 🚀 Próximas Mejoras Planeadas

1. **Order Flow Imbalance** - Desequilibrios en el libro de órdenes
2. **Footprint Charts** - Volumen por nivel de precio exacto
3. **Market Profile** - Distribución de volumen por precio en el tiempo

## 🖥️ Configuración con Claude Desktop

### Instalación Automática (Recomendado):
1. Compilar el MCP:
   ```bash
   cd D:\projects\mcp\waickoff_mcp
   npm install
   npm run build
   ```

2. Agregar a Claude Desktop (`%APPDATA%\Claude\claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "waickoff_mcp": {
         "command": "node",
         "args": ["D:\\projects\\mcp\\waickoff_mcp\\build\\index.js"],
         "env": {}
       }
     }
   }
   ```

3. Reiniciar Claude Desktop - el MCP se cargará automáticamente

### Uso Manual (sin Claude Desktop):
```bash
cd D:\projects\mcp\waickoff_mcp
npm start
```

**Nota**: Con Claude Desktop configurado, no necesitas ejecutar manualmente el MCP. Se inicia automáticamente cuando abres Claude.
