import { useState } from 'react';
import { 
  Box, 
  Stack, 
  Group, 
  Text, 
  // Button, 
  Select, 
  Switch,
  Paper,
  Tabs,
  Badge,
  Grid
} from '@mantine/core';
import { 
  IconChartLine, 
  IconMessages, 
  IconAnalyze,
  IconTrendingUp
} from '@tabler/icons-react';
import { ChatChart } from './ChatChart';
import { IndicatorChart } from './IndicatorChart';
import { ChartManager } from './ChartManager';
import type { ChartConfig } from './ChartManager';

export function ChartDemo() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [selectedTimeframe, setSelectedTimeframe] = useState('60');
  const [showRealTime, setShowRealTime] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');

  // Mock analysis data for demonstration
  const mockAnalysis = {
    wyckoff: {
      phase: 'Accumulation Phase C',
      confidence: 85,
      events: [
        { type: 'Spring', price: 45230, timestamp: '2024-01-15T10:30:00Z' },
        { type: 'Test', price: 45800, timestamp: '2024-01-15T14:20:00Z' }
      ]
    },
    smc: {
      bias: 'Bullish',
      orderBlocks: [
        { price: 45100, type: 'demand', strength: 'strong' },
        { price: 46200, type: 'supply', strength: 'moderate' }
      ],
      fvgs: [
        { high: 45650, low: 45580, type: 'bullish' }
      ]
    },
    technical: {
      trend: 'Uptrend',
      supportResistance: [
        { level: 45000, type: 'support', strength: 'strong' },
        { level: 46500, type: 'resistance', strength: 'moderate' }
      ]
    }
  };

  const symbolOptions = [
    { value: 'BTCUSDT', label: 'BTC/USDT' },
    { value: 'ETHUSDT', label: 'ETH/USDT' },
    { value: 'SOLUSDT', label: 'SOL/USDT' },
    { value: 'ADAUSDT', label: 'ADA/USDT' }
  ];

  const timeframeOptions = [
    { value: '5', label: '5m' },
    { value: '15', label: '15m' },
    { value: '60', label: '1h' },
    { value: '240', label: '4h' },
    { value: '1440', label: '1d' }
  ];

  const handleExpandChart = () => {
    console.log('Expanding chart to fullscreen...');
  };

  const chartConfig: ChartConfig = {
    type: 'candlestick',
    symbol: selectedSymbol,
    timeframe: selectedTimeframe,
    height: 500,
    theme: 'dark',
    showToolbar: true,
    showWatermark: true,
    indicators: ['VWAP', 'Bollinger Bands'],
    overlays: ['Order Blocks', 'FVGs', 'Support/Resistance']
  };

  return (
    <Box p="md">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Text size="xl" fw={700}>📊 Chart System Demo</Text>
            <Text c="dimmed" size="sm">
              Demonstrating TradingView Lightweight Charts integration for chat and indicators
            </Text>
          </div>
          
          <Group gap="md">
            <Select
              label="Symbol"
              data={symbolOptions}
              value={selectedSymbol}
              onChange={(value) => value && setSelectedSymbol(value)}
              w={120}
            />
            <Select
              label="Timeframe"
              data={timeframeOptions}
              value={selectedTimeframe}
              onChange={(value) => value && setSelectedTimeframe(value)}
              w={80}
            />
            <Switch
              label="Real-time"
              checked={showRealTime}
              onChange={(event) => setShowRealTime(event.currentTarget.checked)}
            />
          </Group>
        </Group>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(value) => value && setActiveTab(value)}>
          <Tabs.List>
            <Tabs.Tab value="chat" leftSection={<IconMessages size={16} />}>
              Chat Integration
            </Tabs.Tab>
            <Tabs.Tab value="indicators" leftSection={<IconAnalyze size={16} />}>
              Indicator Charts
            </Tabs.Tab>
            <Tabs.Tab value="full" leftSection={<IconChartLine size={16} />}>
              Full Chart
            </Tabs.Tab>
          </Tabs.List>

          {/* Chat Integration Demo */}
          <Tabs.Panel value="chat" pt="md">
            <Stack gap="md">
              <Text fw={500}>💬 Chat-Embedded Charts</Text>
              <Text size="sm" c="dimmed">
                These charts are designed to be embedded in chat messages with analysis results
              </Text>
              
              <Paper p="md" withBorder>
                <Text size="sm" mb="md" c="blue">
                  🤖 <strong>AI Assistant:</strong> Here's the current market analysis for {selectedSymbol}:
                </Text>
                
                <ChatChart
                  symbol={selectedSymbol}
                  timeframe={selectedTimeframe}
                  analysis={mockAnalysis}
                  height={250}
                  showQuickStats={true}
                  onExpand={handleExpandChart}
                />
                
                <Text size="sm" mt="md" c="dimmed">
                  💡 <strong>Analysis Summary:</strong> The market is showing {mockAnalysis.wyckoff.phase} 
                  with {mockAnalysis.wyckoff.confidence}% confidence. SMC bias is {mockAnalysis.smc.bias}.
                </Text>
              </Paper>

              <Paper p="md" withBorder>
                <Text size="sm" mb="md" c="green">
                  🤖 <strong>AI Assistant:</strong> Volume analysis shows interesting patterns:
                </Text>
                
                <ChatChart
                  symbol={selectedSymbol}
                  timeframe={selectedTimeframe}
                  height={200}
                  showQuickStats={false}
                />
                
                <Group gap="xs" mt="sm">
                  <Badge size="xs" variant="light">High Volume</Badge>
                  <Badge size="xs" variant="light" color="orange">Above VWAP</Badge>
                  <Badge size="xs" variant="light" color="green">Bullish Delta</Badge>
                </Group>
              </Paper>
            </Stack>
          </Tabs.Panel>

          {/* Indicator Charts Demo */}
          <Tabs.Panel value="indicators" pt="md">
            <Stack gap="md">
              <Text fw={500}>📈 Specialized Indicator Charts</Text>
              <Text size="sm" c="dimmed">
                Full-featured charts for specific technical analysis
              </Text>
              
              <Grid>
                <Grid.Col span={6}>
                  <IndicatorChart
                    symbol={selectedSymbol}
                    indicatorType="volume-profile"
                    timeframe={selectedTimeframe}
                    height={300}
                  />
                </Grid.Col>
                
                <Grid.Col span={6}>
                  <IndicatorChart
                    symbol={selectedSymbol}
                    indicatorType="order-flow"
                    timeframe={selectedTimeframe}
                    height={300}
                  />
                </Grid.Col>
                
                <Grid.Col span={6}>
                  <IndicatorChart
                    symbol={selectedSymbol}
                    indicatorType="wyckoff"
                    timeframe={selectedTimeframe}
                    height={300}
                  />
                </Grid.Col>
                
                <Grid.Col span={6}>
                  <IndicatorChart
                    symbol={selectedSymbol}
                    indicatorType="smc"
                    timeframe={selectedTimeframe}
                    height={300}
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </Tabs.Panel>

          {/* Full Chart Demo */}
          <Tabs.Panel value="full" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Text fw={500}>📊 Full Trading Chart</Text>
                  <Text size="sm" c="dimmed">
                    Complete chart with all features enabled
                  </Text>
                </div>
                
                <Group gap="xs">
                  <Badge leftSection={<IconTrendingUp size={12} />} color="green">
                    Live Data
                  </Badge>
                  <Badge variant="outline">133 MCP Tools</Badge>
                </Group>
              </Group>
              
              <ChartManager
                config={chartConfig}
                data={{
                  candlesticks: [],
                  volume: [],
                  indicators: {},
                  overlays: {
                    orderBlocks: mockAnalysis.smc.orderBlocks,
                    fvgs: mockAnalysis.smc.fvgs,
                    supportResistance: mockAnalysis.technical.supportResistance,
                    wyckoffEvents: mockAnalysis.wyckoff.events
                  }
                }}
                isEmbedded={false}
              />
            </Stack>
          </Tabs.Panel>
        </Tabs>

        {/* Features Overview */}
        <Paper p="md" withBorder>
          <Text fw={500} mb="md">🚀 Chart System Features</Text>
          <Grid>
            <Grid.Col span={3}>
              <Text size="sm" fw={500} c="blue">Chat Integration</Text>
              <Text size="xs" c="dimmed">
                • Embedded charts in messages<br/>
                • Quick stats display<br/>
                • Analysis badges<br/>
                • Expand to fullscreen
              </Text>
            </Grid.Col>
            
            <Grid.Col span={3}>
              <Text size="sm" fw={500} c="green">Real-time Data</Text>
              <Text size="xs" c="dimmed">
                • WebSocket connections<br/>
                • Live price updates<br/>
                • Auto-refresh options<br/>
                • Connection status
              </Text>
            </Grid.Col>
            
            <Grid.Col span={3}>
              <Text size="sm" fw={500} c="orange">MCP Integration</Text>
              <Text size="xs" c="dimmed">
                • 133 analysis tools<br/>
                • SMC indicators<br/>
                • Wyckoff analysis<br/>
                • Volume profiling
              </Text>
            </Grid.Col>
            
            <Grid.Col span={3}>
              <Text size="sm" fw={500} c="purple">Professional UI</Text>
              <Text size="xs" c="dimmed">
                • TradingView quality<br/>
                • Dark theme<br/>
                • Export capabilities<br/>
                • Mobile responsive
              </Text>
            </Grid.Col>
          </Grid>
        </Paper>
      </Stack>
    </Box>
  );
} 