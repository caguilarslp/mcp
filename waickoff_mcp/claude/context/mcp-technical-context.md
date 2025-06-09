# 🔧 Contexto Técnico - Bybit MCP Server

## 📋 Información Técnica Detallada

Este documento proporciona contexto técnico profundo sobre la implementación del MCP.

---

## 🏗️ Arquitectura del Sistema

### **Diagrama de Componentes**
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Claude Desktop │────▶│  Bybit MCP Server│────▶│  Bybit API v5   │
│   (MCP Client)  │◀────│   (TypeScript)   │◀────│  (Public REST)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  Waickoff AI │
                        │   (Futuro)   │
                        └──────────────┘
```

### **Flujo de Datos**
1. Claude/Usuario solicita información via MCP protocol
2. MCP Server procesa request y llama a Bybit API
3. Bybit retorna datos públicos
4. MCP procesa/enriche datos (VWAP, Delta, etc.)
5. MCP retorna respuesta estructurada a Claude

---

## 🔌 Endpoints de Bybit Utilizados

### **Públicos (Actuales)**
- `/v5/market/tickers` - Precios y estadísticas 24h
- `/v5/market/orderbook` - Libro de órdenes
- `/v5/market/kline` - Datos OHLCV históricos
- `/v5/market/recent-trade` - Trades recientes (no usado aún)

### **Autenticados (Futuros)**
- `/v5/order/create` - Crear órdenes
- `/v5/position/list` - Posiciones abiertas
- `/v5/account/wallet-balance` - Balance de cuenta
- `/v5/market/funding/history` - Funding rates

---

## 💻 Implementación Técnica

### **Estructura de Herramientas MCP**
```typescript
interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}
```

### **Patrón de Implementación**
```typescript
// 1. Definir tool en setupHandlers()
{
  name: 'tool_name',
  description: 'Qué hace la herramienta',
  inputSchema: { /* JSON Schema */ }
}

// 2. Handler en CallToolRequestSchema
case 'tool_name':
  return await this.toolImplementation(args);

// 3. Implementación
private async toolImplementation(args: any) {
  try {
    const data = await this.makeRequest(endpoint);
    // Procesar datos
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    // Manejo de errores
  }
}
```

### **Cálculos Clave**

#### **VWAP (Volume-Weighted Average Price)**
```typescript
let cumulativeVolume = 0;
let cumulativePriceVolume = 0;

data.forEach(candle => {
  cumulativeVolume += candle.volume;
  cumulativePriceVolume += candle.price * candle.volume;
  vwap = cumulativePriceVolume / cumulativeVolume;
});
```

#### **Volume Delta Aproximado**
```typescript
const range = high - low;
const closePosition = (close - low) / range;
const buyVolume = volume * closePosition;
const sellVolume = volume * (1 - closePosition);
const delta = buyVolume - sellVolume;
```

---

## 🛠️ Guía de Desarrollo

### **Agregar Nueva Herramienta**

1. **Definir en `setupHandlers()`**
```typescript
tools.push({
  name: 'nueva_herramienta',
  description: 'Descripción clara',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: { type: 'string', description: 'Par de trading' },
      // más parámetros
    },
    required: ['symbol']
  }
});
```

2. **Agregar case en handler**
```typescript
case 'nueva_herramienta':
  return await this.nuevaHerramienta(
    args.symbol as string,
    args.otroParam as number
  );
```

3. **Implementar función**
```typescript
private async nuevaHerramienta(symbol: string, otroParam: number) {
  // Implementación
}
```

### **Testing Local**

```bash
# Compilar
npm run build

# Ejecutar
npm start

# En otra terminal, probar con MCP client
# O configurar en Claude Desktop
```

### **Debugging**

```typescript
// Usar console.error para debug (va a stderr)
console.error('Debug:', variable);

// En producción, comentar o remover
```

---

## 📊 Optimizaciones Implementadas

### **Cache de Requests**
- No implementado aún
- Considerado para v1.3
- Evitaría llamadas repetidas

### **Batch Processing**
- No necesario con endpoints públicos
- Útil cuando se agreguen API keys

### **Error Recovery**
```typescript
// Patrón actual
try {
  const data = await this.makeRequest(endpoint);
  // Procesar
} catch (error) {
  // Retry logic puede agregarse aquí
  throw error;
}
```

---

## 🔒 Consideraciones de Seguridad

### **Estado Actual**
- ✅ No se manejan API keys
- ✅ No se almacena información sensible
- ✅ Solo lectura, no escritura
- ✅ No hay estado persistente

### **Futuras (con API Keys)**
- ⚠️ Nunca loggear API keys
- ⚠️ Usar variables de entorno
- ⚠️ Implementar rate limiting
- ⚠️ Validar todos los inputs

---

## 🚀 Roadmap Técnico

### **v1.2 - Análisis Avanzado**
- Support/Resistance automáticos
- Pivot points
- Pattern recognition básico

### **v1.3 - Performance**
- Caching inteligente
- Batch requests
- Optimización de cálculos

### **v2.0 - Trading Features**
- API key support
- Order management
- Portfolio tracking

---

## 📚 Recursos y Referencias

### **Documentación**
- [MCP SDK](https://github.com/anthropics/model-context-protocol)
- [Bybit API v5](https://bybit-exchange.github.io/docs/v5/intro)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### **Conceptos de Trading**
- [Volume Profile](https://www.investopedia.com/terms/v/volume-analysis.asp)
- [VWAP](https://www.investopedia.com/terms/v/vwap.asp)
- [Wyckoff Method](https://school.stockcharts.com/doku.php?id=market_analysis:the_wyckoff_method)

---

## 💡 Tips y Trucos

1. **Siempre retornar JSON formateado**
```typescript
JSON.stringify(data, null, 2) // Indentación de 2 espacios
```

2. **Usar tipos específicos**
```typescript
// Malo
args.symbol as any

// Bueno
args.symbol as string
```

3. **Manejar casos edge**
```typescript
const range = high - low;
const closePosition = range > 0 ? (close - low) / range : 0.5;
```

4. **Documentar decisiones no obvias**
```typescript
// Usamos 1.5x como threshold para picos porque
// estudios muestran que es significativo
const volumeSpikes = data.filter(d => d.volume > avg * 1.5);
```

---

*Este documento se actualiza cuando se agregan nuevas características técnicas significativas*