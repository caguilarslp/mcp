import { useState, useEffect } from 'react';
import { Box, Group, Text, Badge, ActionIcon, Tooltip } from '@mantine/core';
import { 
  IconMaximize, 
  IconDownload, 
  IconRefresh,
  IconChartLine,
  IconTrendingUp,
  IconTrendingDown
} from '@tabler/icons-react';
import { ChartManager } from './ChartManager';
import type { ChartConfig, ChartData } from './ChartManager';
import { apiService } from '../../services/api';

interface ChatChartProps {
  symbol: string;
  timeframe?: string;
  analysis?: any; // Analysis results from LLM tools
  height?: number;
  showQuickStats?: boolean;
  onExpand?: () => void;
}

export function ChatChart({ 
  symbol, 
  timeframe = '60',
  analysis,
  height = 250,
  showQuickStats = true,
  onExpand 
}: ChatChartProps) {
  const [chartData, setChartData] = useState<ChartData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickStats, setQuickStats] = useState<any>(null);

  const chartConfig: ChartConfig = {
    type: 'candlestick',
    symbol,
    timeframe,
    height,
    theme: 'dark',
    showToolbar: false,
    showWatermark: false,
    indicators: ['VWAP'],
    overlays: []
  };

  // Load chart data
  const loadChartData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get market data from API
      const response = await apiService.getMarketData(symbol);
      
      if (response.success && response.data) {
        const marketData = response.data;
        
        // Convert to chart format
        const candlesticks = marketData.klines?.map((kline: any) => ({
          time: new Date(kline.timestamp).getTime() / 1000,
          open: kline.open,
          high: kline.high,
          low: kline.low,
          close: kline.close
        })) || [];

        const volume = marketData.klines?.map((kline: any) => ({
          time: new Date(kline.timestamp).getTime() / 1000,
          value: kline.volume,
          color: kline.close > kline.open ? '#3fb950' : '#f85149'
        })) || [];

        // Add VWAP if available
        const indicators: any = {};
        if (marketData.vwap) {
          indicators.VWAP = marketData.vwap.map((point: any) => ({
            time: new Date(point.timestamp).getTime() / 1000,
            value: point.price
          }));
        }

        setChartData({
          candlesticks,
          volume,
          indicators,
          overlays: extractOverlaysFromAnalysis(analysis)
        });

        // Extract quick stats
        if (marketData.ticker) {
          setQuickStats({
            price: marketData.ticker.lastPrice,
            change: marketData.ticker.priceChange,
            changePercent: marketData.ticker.priceChangePercent,
            volume: marketData.ticker.volume,
            high24h: marketData.ticker.highPrice,
            low24h: marketData.ticker.lowPrice
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
    } finally {
      setIsLoading(false);
    }
  };

  // Extract overlays from analysis results
  const extractOverlaysFromAnalysis = (analysis: any) => {
    if (!analysis) return {};

    const overlays: any = {};

    // Extract order blocks from SMC analysis
    if (analysis.smc?.orderBlocks) {
      overlays.orderBlocks = analysis.smc.orderBlocks;
    }

    // Extract FVGs
    if (analysis.smc?.fvgs) {
      overlays.fvgs = analysis.smc.fvgs;
    }

    // Extract support/resistance levels
    if (analysis.technical?.supportResistance) {
      overlays.supportResistance = analysis.technical.supportResistance;
    }

    // Extract Wyckoff events
    if (analysis.wyckoff?.events) {
      overlays.wyckoffEvents = analysis.wyckoff.events;
    }

    return overlays;
  };

  // Load data on mount and when symbol/timeframe changes
  useEffect(() => {
    loadChartData();
  }, [symbol, timeframe]);

  // Update overlays when analysis changes
  useEffect(() => {
    if (analysis) {
      setChartData(prev => ({
        ...prev,
        overlays: extractOverlaysFromAnalysis(analysis)
      }));
    }
  }, [analysis]);

  const handleRefresh = () => {
    loadChartData();
  };

  const handleDownload = () => {
    // Implementation for downloading chart
    console.log('Download chart for', symbol);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(price);
  };

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  if (error) {
    return (
      <Box 
        p="md" 
        style={{ 
          border: '1px solid #f85149',
          borderRadius: 8,
          backgroundColor: 'rgba(248, 81, 73, 0.1)'
        }}
      >
        <Text c="red" size="sm">
          Failed to load chart: {error}
        </Text>
        <ActionIcon 
          variant="light" 
          color="red" 
          size="sm" 
          mt="xs"
          onClick={handleRefresh}
        >
          <IconRefresh size={14} />
        </ActionIcon>
      </Box>
    );
  }

  return (
    <Box style={{ position: 'relative' }}>
      {/* Quick Stats Header */}
      {showQuickStats && quickStats && (
        <Group justify="space-between" mb="xs" px="sm">
          <Group gap="xs">
            <Text fw={600} size="sm">{symbol}</Text>
            <Text fw={500} size="sm">
              {formatPrice(quickStats.price)}
            </Text>
            <Badge 
              color={quickStats.change >= 0 ? 'green' : 'red'}
              variant="light"
              size="sm"
            >
              {quickStats.change >= 0 ? (
                <IconTrendingUp size={10} />
              ) : (
                <IconTrendingDown size={10} />
              )}
              {formatPercent(quickStats.changePercent)}
            </Badge>
          </Group>

          <Group gap="xs">
            <Tooltip label="Refresh data">
              <ActionIcon 
                variant="subtle" 
                size="sm"
                onClick={handleRefresh}
                loading={isLoading}
              >
                <IconRefresh size={12} />
              </ActionIcon>
            </Tooltip>
            
            <Tooltip label="Download chart">
              <ActionIcon 
                variant="subtle" 
                size="sm"
                onClick={handleDownload}
              >
                <IconDownload size={12} />
              </ActionIcon>
            </Tooltip>
            
            {onExpand && (
              <Tooltip label="Expand chart">
                <ActionIcon 
                  variant="subtle" 
                  size="sm"
                  onClick={onExpand}
                >
                  <IconMaximize size={12} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>
      )}

      {/* Chart */}
      <ChartManager
        config={chartConfig}
        data={chartData}
        onDataRequest={loadChartData}
        isEmbedded={true}
      />

      {/* Analysis Insights */}
      {analysis && (
        <Box mt="xs" px="sm">
          <Group gap="xs">
            {analysis.wyckoff?.phase && (
              <Badge variant="light" size="xs">
                Wyckoff: {analysis.wyckoff.phase}
              </Badge>
            )}
            {analysis.smc?.bias && (
              <Badge variant="light" size="xs" color="blue">
                SMC: {analysis.smc.bias}
              </Badge>
            )}
            {analysis.technical?.trend && (
              <Badge variant="light" size="xs" color="orange">
                Trend: {analysis.technical.trend}
              </Badge>
            )}
          </Group>
        </Box>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            zIndex: 1000
          }}
        >
          <Group>
            <IconChartLine size={20} />
            <Text c="white" size="sm">Loading chart...</Text>
          </Group>
        </Box>
      )}
    </Box>
  );
} 