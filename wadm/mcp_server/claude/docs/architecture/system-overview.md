# 🏗️ Bybit MCP Server - Architecture Overview

## 📐 System Architecture

### **High-Level Design**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Claude IDE    │◄──►│   Bybit MCP      │◄──►│   Bybit API     │
│                 │    │   Server         │    │   (Public)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         ▲                        │                       │
         │                        ▼                       │
┌─────────────────┐    ┌──────────────────┐              │
│  Waickoff AI    │    │  Analysis Tools  │              │
│  (Future)       │    │  - Volume Delta  │              │
│                 │    │  - S/R Detection │              │
└─────────────────┘    │  - Grid Suggest  │              │
                       └──────────────────┘              │
                                ▲                        │
                                └────────────────────────┘
```

### **Component Overview**

#### **1. MCP Server Core (`src/index.ts`)**
- **Responsibility**: Protocol handling and tool orchestration
- **Framework**: Model Context Protocol SDK
- **Transport**: StdioServerTransport
- **Dependencies**: `@modelcontextprotocol/sdk`, `node-fetch`

#### **2. Market Data Layer**
- **Base URL**: `https://api.bybit.com`
- **Endpoints Used**: Public market data only (no API key required)
- **Rate Limiting**: Built-in by Bybit
- **Error Handling**: Comprehensive try/catch with detailed messages

#### **3. Analysis Engine**
- **Volume Analysis**: Traditional + VWAP + Volume Delta
- **Technical Analysis**: Support/Resistance detection with pivot algorithm
- **Grid Trading**: Volatility-based suggestions with risk assessment
- **Real-time Processing**: Live market data integration

---

## 🔄 Data Flow Architecture

### **Request Processing Flow**
```
User Request → Claude → MCP → Tool Selection → Bybit API → Data Processing → Response
     ▲                                                                            │
     └─────────────────────── Formatted Analysis ◄─────────────────────────────┘
```

### **Detailed Processing Pipeline**

1. **Input Validation**
   ```typescript
   if (!args || !args.symbol) {
     throw new Error('Missing required parameters');
   }
   ```

2. **API Request Formation**
   ```typescript
   const url = `${this.baseUrl}/v5/market/kline?category=${category}&symbol=${symbol}`;
   ```

3. **Data Transformation**
   ```typescript
   const klineData = result.list.map((kline: string[]) => ({
     timestamp: new Date(parseInt(kline[0])).toISOString(),
     open: parseFloat(kline[1]),
     // ... more fields
   }));
   ```

4. **Analysis Application**
   - Volume calculations with VWAP
   - Pivot detection algorithms
   - Statistical scoring
   - Risk assessment

5. **Response Formatting**
   ```typescript
   return {
     content: [{
       type: 'text',
       text: JSON.stringify(analysisResult, null, 2)
     }]
   };
   ```

---

## 🎯 Design Principles

### **1. Separation of Concerns**
- **Data Layer**: Pure market data acquisition
- **Analysis Layer**: Technical analysis and calculations
- **Presentation Layer**: Formatted output for Claude

### **2. Stateless Design**
- No persistent storage
- Each request independent
- No session management
- Scalable and reliable

### **3. Type Safety**
```typescript
interface SupportResistanceLevel {
  level: number;
  type: 'support' | 'resistance';
  strength: number;
  touches: number;
  volumeConfirmation: number;
  lastTouchTime: string;
  priceDistance: number;
}
```

### **4. Error Resilience**
```typescript
try {
  const result = await this.makeRequest(endpoint);
  return this.processData(result);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  return this.formatError(name, errorMessage);
}
```

---

## 🔧 Tool Architecture

### **Tool Registration Pattern**
```typescript
{
  name: 'tool_name',
  description: 'Human-readable description',
  inputSchema: {
    type: 'object',
    properties: { /* parameters */ },
    required: ['required_params']
  }
}
```

### **Tool Execution Pattern**
```typescript
case 'tool_name':
  return await this.toolMethod(
    args.param1 as string,
    (args.param2 as number) || defaultValue
  );
```

### **Current Tool Inventory**
1. **Market Data**: `get_ticker`, `get_orderbook`, `get_klines`
2. **Analysis**: `analyze_volatility`, `get_volume_analysis`, `get_volume_delta`
3. **Support/Resistance**: `identify_support_resistance`
4. **Trading**: `suggest_grid_levels`

---

## 📊 Algorithm Architecture

### **Support/Resistance Detection**
```
Input: OHLCV Data + Parameters
    ↓
Pivot Detection (High/Low Points)
    ↓
Grouping (0.5% tolerance)
    ↓
Multi-Factor Scoring:
  • Touch Count (40%)
  • Volume Confirmation (30%)
  • Proximity to Price (20%)
  • Recency (10%)
    ↓
Classification (Support vs Resistance)
    ↓
Output: Ranked Levels
```

### **Volume Delta Approximation**
```
Input: OHLCV Data
    ↓
Calculate Close Position in Range
    ↓
Volume Distribution:
  • Buy Volume = Total * ClosePosition
  • Sell Volume = Total * (1 - ClosePosition)
    ↓
Delta = Buy Volume - Sell Volume
    ↓
Cumulative Delta Analysis
    ↓
Divergence Detection
```

---

## 🔗 Integration Architecture

### **Claude Desktop Integration**
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

### **Future Waickoff AI Integration**
```typescript
// Planned architecture
interface WaickoffMCPClient {
  getMarketData(symbol: string): Promise<MarketAnalysis>;
  getSupportResistance(symbol: string): Promise<SRLevels>;
  getVolumeProfile(symbol: string): Promise<VolumeData>;
}
```

---

## 🚀 Scalability Considerations

### **Performance Optimizations**
- Efficient API usage (minimal requests)
- Smart caching strategies (future)
- Concurrent processing where possible
- Memory-efficient data structures

### **Extensibility Points**
- Plugin architecture for new exchanges
- Modular analysis components
- Configurable parameters
- Custom indicator support

### **Reliability Features**
- Comprehensive error handling
- Graceful degradation
- Retry mechanisms (future)
- Health monitoring (future)

---

## 📝 Architectural Decisions Log

### **ADR-001: TypeScript for Implementation**
- **Decision**: Use TypeScript for all code
- **Rationale**: Type safety, better IDE support, easier maintenance
- **Consequences**: Compilation step required, but much better developer experience

### **ADR-002: No API Keys in v1.x**
- **Decision**: Start with public endpoints only
- **Rationale**: Immediate usability, no configuration barrier
- **Consequences**: Limited functionality, but easier onboarding

### **ADR-003: Volume Delta Approximation**
- **Decision**: Approximate Volume Delta without tick data
- **Rationale**: Sufficient accuracy for trend detection
- **Consequences**: Not precise, but practical for analysis

See `claude/decisions/adr-log.md` for complete decision history.

---

*Architecture documentation maintained as part of the project trazability system*
*Last updated: 08/06/2025 | Version: v1.2.1*