# 📊 WADM Chart System

## Overview

Sistema completo de gráficos para WADM basado en **TradingView Lightweight Charts** con integración híbrida para chat e indicadores especializados.

## 🏗️ Architecture

```
app/src/components/Charts/
├── ChartManager.tsx      # Core chart component
├── ChatChart.tsx         # Chat-embedded charts
├── IndicatorChart.tsx    # Specialized indicator charts
├── ChartDemo.tsx         # Demo & examples
├── index.ts              # Exports
└── README.md            # This file

app/src/hooks/
└── useChartData.ts      # Chart data management hooks
```

## 🚀 Components

### 1. ChartManager (Core)
**Purpose**: Base chart component using TradingView Lightweight Charts
**Features**:
- Candlestick, line, area, volume charts
- Multiple indicators overlay
- SMC overlays (Order Blocks, FVGs)
- Dark/light themes
- Export capabilities
- Responsive design

```tsx
import { ChartManager } from './components/Charts';

<ChartManager
  config={{
    type: 'candlestick',
    symbol: 'BTCUSDT',
    timeframe: '60',
    height: 400,
    theme: 'dark',
    showToolbar: true,
    indicators: ['VWAP', 'Bollinger Bands']
  }}
  data={chartData}
  isEmbedded={false}
/>
```

### 2. ChatChart (Chat Integration)
**Purpose**: Compact charts for chat messages
**Features**:
- Embedded in chat responses
- Quick stats display
- Analysis badges
- Expand to fullscreen
- Auto-sizing (250px default)

```tsx
import { ChatChart } from './components/Charts';

<ChatChart
  symbol="BTCUSDT"
  timeframe="60"
  analysis={llmAnalysisResults}
  height={250}
  showQuickStats={true}
  onExpand={() => openFullChart()}
/>
```

### 3. IndicatorChart (Specialized)
**Purpose**: Full-featured charts for specific indicators
**Features**:
- Volume Profile analysis
- Order Flow & Volume Delta
- Wyckoff methodology
- Smart Money Concepts
- Bollinger Bands analysis

```tsx
import { IndicatorChart } from './components/Charts';

<IndicatorChart
  symbol="BTCUSDT"
  indicatorType="volume-profile"
  timeframe="60"
  height={400}
  onDataUpdate={(data) => handleAnalysisUpdate(data)}
/>
```

## 🔧 Hooks

### useChartData
**Purpose**: Manage chart data with MCP integration
**Features**:
- Auto data loading
- Indicator integration
- Real-time updates
- Error handling
- Caching

```tsx
import { useChartData } from './hooks/useChartData';

const { data, isLoading, error, refresh } = useChartData({
  symbol: 'BTCUSDT',
  timeframe: '60',
  indicators: ['VWAP', 'bollinger'],
  autoRefresh: true,
  refreshInterval: 30000
});
```

### useRealTimeChartData
**Purpose**: WebSocket real-time data
**Features**:
- Live price updates
- Connection management
- Auto-reconnection
- Error handling

```tsx
import { useRealTimeChartData } from './hooks/useChartData';

const { data, isConnected } = useRealTimeChartData('BTCUSDT');
```

## 🎯 Usage Scenarios

### 1. Chat Integration
```tsx
// In chat response component
function ChatResponse({ message, analysis }) {
  return (
    <div>
      <p>{message}</p>
      {analysis && (
        <ChatChart
          symbol={analysis.symbol}
          analysis={analysis}
          height={250}
          showQuickStats={true}
        />
      )}
    </div>
  );
}
```

### 2. Dashboard Indicators
```tsx
// In dashboard layout
function TradingDashboard() {
  return (
    <Grid>
      <Grid.Col span={6}>
        <IndicatorChart
          symbol="BTCUSDT"
          indicatorType="volume-profile"
        />
      </Grid.Col>
      <Grid.Col span={6}>
        <IndicatorChart
          symbol="BTCUSDT"
          indicatorType="smc"
        />
      </Grid.Col>
    </Grid>
  );
}
```

### 3. Full Analysis View
```tsx
// In analysis page
function AnalysisPage() {
  const { data } = useChartData({
    symbol: 'BTCUSDT',
    indicators: ['VWAP', 'bollinger', 'volume_delta'],
    autoRefresh: true
  });

  return (
    <ChartManager
      config={{
        type: 'candlestick',
        symbol: 'BTCUSDT',
        height: 600,
        showToolbar: true,
        indicators: ['VWAP', 'Bollinger Bands']
      }}
      data={data}
    />
  );
}
```

## 🔌 MCP Integration

### Supported Tools
- `analyze_volume` → VWAP, Volume Profile
- `analyze_volume_delta` → Order Flow, CVD
- `analyze_wyckoff_phase` → Wyckoff events
- `detect_order_blocks` → SMC overlays
- `analyze_bollinger_bands` → Bollinger analysis

### Data Flow
```
1. Component requests data
2. Hook calls MCP tools via apiService
3. Raw data converted to chart format
4. Chart renders with overlays
5. Real-time updates via WebSocket
```

## 🎨 Theming

### Dark Theme (Default)
```typescript
{
  background: '#0d1117',
  textColor: '#c9d1d9',
  gridLines: '#30363d',
  upColor: '#3fb950',
  downColor: '#f85149'
}
```

### Professional Colors
- **Bullish**: `#3fb950` (GitHub green)
- **Bearish**: `#f85149` (GitHub red)
- **VWAP**: `#d29922` (Warning yellow)
- **Volume**: `#58a6ff` (GitHub blue)
- **Indicators**: Various semantic colors

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 768px → Single column, 250px height
- **Tablet**: 768-1024px → Two columns, 300px height
- **Desktop**: > 1024px → Full layout, 400-600px height

### Chat Embedding
- **Compact**: 200-250px height
- **Quick Stats**: Price, change, volume
- **Expand Button**: Opens fullscreen modal
- **Touch Friendly**: Large tap targets

## 🚀 Performance

### Optimizations
- **Lazy Loading**: Charts load on demand
- **Data Caching**: Hook-level caching
- **WebSocket Pooling**: Shared connections
- **Canvas Rendering**: Hardware acceleration
- **Memory Management**: Proper cleanup

### Metrics
- **Initial Load**: < 2s with data
- **Real-time Updates**: < 100ms latency
- **Memory Usage**: < 50MB per chart
- **Frame Rate**: 60fps animations

## 🧪 Demo

Run the demo component to see all features:

```tsx
import { ChartDemo } from './components/Charts';

function App() {
  return <ChartDemo />;
}
```

**Demo Features**:
- ✅ Chat integration examples
- ✅ Indicator chart showcase
- ✅ Full chart with all features
- ✅ Real-time data toggle
- ✅ Symbol/timeframe switching
- ✅ Feature overview

## 🔄 Integration with Phase 3

### Chat Intelligence
```tsx
// LLM response with chart
const response = await chatService.sendMessage(
  "Analyze BTCUSDT with chart",
  { includeChart: true, useTools: true }
);

// Response includes chart data
<ChatChart
  symbol="BTCUSDT"
  analysis={response.toolResults}
  height={250}
/>
```

### Multi-LLM Support
- **Claude**: Best for educational analysis
- **GPT-4**: Balanced performance
- **Gemini**: Cost-effective for frequent updates

### Tool Orchestration
- Charts automatically request relevant MCP tools
- LLM plans which indicators to show
- Results integrated into chart overlays
- Streaming updates for real-time analysis

## 🎯 Next Steps

### Phase 3B - Chat Interface
1. **Message Rendering**: Integrate ChatChart in messages
2. **Tool Visualization**: Show MCP tool execution
3. **Interactive Elements**: Click-to-analyze features
4. **Export Features**: Save analysis with charts

### Phase 4 - Advanced Features
1. **Multi-timeframe Sync**: Synchronized charts
2. **Alert Integration**: Visual alerts on charts
3. **Drawing Tools**: Manual analysis tools
4. **Advanced Overlays**: Custom SMC patterns

---

## 📋 Quick Start

1. **Install Dependencies** (already done):
   ```bash
   npm install lightweight-charts
   ```

2. **Import Components**:
   ```tsx
   import { ChatChart, IndicatorChart, ChartManager } from './components/Charts';
   ```

3. **Use in Chat**:
   ```tsx
   <ChatChart symbol="BTCUSDT" analysis={results} />
   ```

4. **Use in Dashboard**:
   ```tsx
   <IndicatorChart symbol="BTCUSDT" indicatorType="smc" />
   ```

**¡Sistema completo y listo para integración! 🚀** 