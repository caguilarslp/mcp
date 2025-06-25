import { useState, useEffect } from 'react';
import { Box, Group, Text, Badge, Select, ActionIcon } from '@mantine/core';
import { IconRefresh, IconSettings } from '@tabler/icons-react';
import { ChartManager } from './ChartManager';
import type { ChartConfig, ChartData } from './ChartManager';
import { apiService } from '../../services/api';

interface IndicatorChartProps {
  symbol: string;
  indicatorType: 'volume-profile' | 'order-flow' | 'wyckoff' | 'smc' | 'bollinger';
  timeframe?: string;
  height?: number;
  className?: string;
  onDataUpdate?: (data: any) => void;
}

export function IndicatorChart({
  symbol,
  indicatorType,
  timeframe = '60',
  height = 400,
  className,
  onDataUpdate
}: IndicatorChartProps) {
  const [chartData, setChartData] = useState<ChartData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [indicatorData, setIndicatorData] = useState<any>(null);

  // Chart configuration based on indicator type
  const getChartConfig = (): ChartConfig => {
    const baseConfig = {
      symbol,
      timeframe: selectedTimeframe,
      height,
      theme: 'dark' as const,
      showToolbar: true,
      showWatermark: true
    };

    switch (indicatorType) {
      case 'volume-profile':
        return {
          ...baseConfig,
          type: 'volume' as const,
          indicators: ['VWAP', 'Volume Profile'],
          overlays: ['POC', 'VAH', 'VAL']
        };
      
      case 'order-flow':
        return {
          ...baseConfig,
          type: 'indicator' as const,
          indicators: ['Volume Delta', 'CVD', 'Order Flow'],
          overlays: ['Absorption Levels']
        };
      
      case 'wyckoff':
        return {
          ...baseConfig,
          type: 'candlestick' as const,
          indicators: ['Composite Man', 'Effort vs Result'],
          overlays: ['Wyckoff Events', 'Springs', 'Upthrusts']
        };
      
      case 'smc':
        return {
          ...baseConfig,
          type: 'candlestick' as const,
          indicators: ['Market Structure'],
          overlays: ['Order Blocks', 'FVGs', 'Break of Structure']
        };
      
      case 'bollinger':
        return {
          ...baseConfig,
          type: 'candlestick' as const,
          indicators: ['Bollinger Bands', 'BB Width'],
          overlays: ['Squeeze Signals']
        };
      
      default:
        return {
          ...baseConfig,
          type: 'candlestick' as const,
          indicators: [],
          overlays: []
        };
    }
  };

  // Load specific indicator data
  const loadIndicatorData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let response;
      
      switch (indicatorType) {
        case 'volume-profile':
          response = await apiService.executeMCPTool('analyze_volume', {
            symbol,
            timeframe: selectedTimeframe
          });
          break;
        
        case 'order-flow':
          response = await apiService.executeMCPTool('analyze_volume_delta', {
            symbol,
            timeframe: selectedTimeframe
          });
          break;
        
        case 'wyckoff':
          response = await apiService.executeMCPTool('analyze_wyckoff_phase', {
            symbol,
            timeframe: selectedTimeframe
          });
          break;
        
        case 'smc':
          response = await apiService.executeMCPTool('detect_order_blocks', {
            symbol,
            timeframe: selectedTimeframe
          });
          break;
        
        case 'bollinger':
          response = await apiService.executeMCPTool('analyze_bollinger_bands', {
            symbol,
            timeframe: selectedTimeframe
          });
          break;
        
        default:
          throw new Error(`Unknown indicator type: ${indicatorType}`);
      }

      if (response.success && response.data) {
        const data = response.data;
        setIndicatorData(data);
        
        // Convert to chart format
        const formattedData = formatIndicatorData(data);
        setChartData(formattedData);
        
        // Notify parent component
        if (onDataUpdate) {
          onDataUpdate(data);
        }
      } else {
        throw new Error(response.error || 'Failed to load indicator data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load indicator data');
    } finally {
      setIsLoading(false);
    }
  };

  // Format indicator data for chart display
  const formatIndicatorData = (data: any): ChartData => {
    const formatted: ChartData = {};

    switch (indicatorType) {
      case 'volume-profile':
        if (data.volumeProfile) {
          formatted.volume = data.volumeProfile.map((point: any) => ({
            time: new Date(point.timestamp).getTime() / 1000,
            value: point.volume,
            color: point.type === 'buy' ? '#3fb950' : '#f85149'
          }));
        }
        
        if (data.vwap) {
          formatted.indicators = {
            VWAP: data.vwap.map((point: any) => ({
              time: new Date(point.timestamp).getTime() / 1000,
              value: point.price
            }))
          };
        }
        break;
      
      case 'order-flow':
        if (data.volumeDelta) {
          formatted.indicators = {
            'Volume Delta': data.volumeDelta.map((point: any) => ({
              time: new Date(point.timestamp).getTime() / 1000,
              value: point.delta
            }))
          };
        }
        
        if (data.cvd) {
          formatted.indicators = {
            ...formatted.indicators,
            'CVD': data.cvd.map((point: any) => ({
              time: new Date(point.timestamp).getTime() / 1000,
              value: point.cumulativeDelta
            }))
          };
        }
        break;
      
      case 'wyckoff':
        if (data.compositeMane) {
          formatted.indicators = {
            'Composite Man': data.compositeMane.map((point: any) => ({
              time: new Date(point.timestamp).getTime() / 1000,
              value: point.strength
            }))
          };
        }
        
        if (data.events) {
          formatted.overlays = {
            wyckoffEvents: data.events
          };
        }
        break;
      
      case 'smc':
        if (data.orderBlocks) {
          formatted.overlays = {
            orderBlocks: data.orderBlocks
          };
        }
        
        if (data.fvgs) {
          formatted.overlays = {
            ...formatted.overlays,
            fvgs: data.fvgs
          };
        }
        break;
      
      case 'bollinger':
        if (data.bands) {
          formatted.indicators = {
            'Upper Band': data.bands.map((point: any) => ({
              time: new Date(point.timestamp).getTime() / 1000,
              value: point.upper
            })),
            'Middle Band': data.bands.map((point: any) => ({
              time: new Date(point.timestamp).getTime() / 1000,
              value: point.middle
            })),
            'Lower Band': data.bands.map((point: any) => ({
              time: new Date(point.timestamp).getTime() / 1000,
              value: point.lower
            }))
          };
        }
        break;
    }

    return formatted;
  };

  // Load data when component mounts or dependencies change
  useEffect(() => {
    loadIndicatorData();
  }, [symbol, indicatorType, selectedTimeframe]);

  // Get indicator title
  const getIndicatorTitle = () => {
    const titles = {
      'volume-profile': 'Volume Profile Analysis',
      'order-flow': 'Order Flow & Volume Delta',
      'wyckoff': 'Wyckoff Methodology',
      'smc': 'Smart Money Concepts',
      'bollinger': 'Bollinger Bands Analysis'
    };
    return titles[indicatorType] || 'Technical Indicator';
  };

  // Get indicator stats
  const getIndicatorStats = () => {
    if (!indicatorData) return null;

    switch (indicatorType) {
      case 'volume-profile':
        return indicatorData.summary ? {
          'POC': `$${indicatorData.summary.poc?.toFixed(2)}`,
          'VAH': `$${indicatorData.summary.vah?.toFixed(2)}`,
          'VAL': `$${indicatorData.summary.val?.toFixed(2)}`,
          'Volume': indicatorData.summary.totalVolume?.toLocaleString()
        } : null;
      
      case 'order-flow':
        return indicatorData.summary ? {
          'Net Delta': indicatorData.summary.netDelta?.toFixed(0),
          'Buy Volume': indicatorData.summary.buyVolume?.toLocaleString(),
          'Sell Volume': indicatorData.summary.sellVolume?.toLocaleString(),
          'Bias': indicatorData.summary.bias
        } : null;
      
      case 'wyckoff':
        return indicatorData.phase ? {
          'Phase': indicatorData.phase.current,
          'Confidence': `${indicatorData.phase.confidence}%`,
          'Events': indicatorData.events?.length || 0,
          'Strength': indicatorData.strength?.toFixed(1)
        } : null;
      
      case 'smc':
        return indicatorData.summary ? {
          'Bias': indicatorData.summary.bias,
          'Order Blocks': indicatorData.orderBlocks?.length || 0,
          'FVGs': indicatorData.fvgs?.length || 0,
          'Confluence': `${indicatorData.summary.confluenceScore || 0}%`
        } : null;
      
      case 'bollinger':
        return indicatorData.analysis ? {
          'Position': indicatorData.analysis.position,
          'Squeeze': indicatorData.analysis.squeeze ? 'Yes' : 'No',
          'Width': `${indicatorData.analysis.bandwidth?.toFixed(2)}%`,
          'Signal': indicatorData.analysis.signal
        } : null;
      
      default:
        return null;
    }
  };

  const timeframeOptions = [
    { value: '5', label: '5m' },
    { value: '15', label: '15m' },
    { value: '60', label: '1h' },
    { value: '240', label: '4h' },
    { value: '1440', label: '1d' }
  ];

  if (error) {
    return (
      <Box p="md" style={{ border: '1px solid #f85149', borderRadius: 8 }}>
        <Text c="red" size="sm">{error}</Text>
        <ActionIcon variant="light" color="red" size="sm" mt="xs" onClick={loadIndicatorData}>
          <IconRefresh size={14} />
        </ActionIcon>
      </Box>
    );
  }

  const stats = getIndicatorStats();

  return (
    <Box className={className}>
      {/* Header */}
      <Group justify="space-between" mb="md">
        <div>
          <Text fw={600} size="lg">{getIndicatorTitle()}</Text>
          <Group gap="xs" mt="xs">
            <Badge variant="light">{symbol}</Badge>
            <Badge variant="outline" size="sm">
              {selectedTimeframe}m
            </Badge>
            {isLoading && (
              <Badge color="blue" variant="dot" size="sm">
                Loading...
              </Badge>
            )}
          </Group>
        </div>

        <Group gap="xs">
          <Select
            data={timeframeOptions}
            value={selectedTimeframe}
            onChange={(value) => value && setSelectedTimeframe(value)}
            size="sm"
            w={80}
          />
          <ActionIcon
            variant="light"
            onClick={loadIndicatorData}
            loading={isLoading}
          >
            <IconRefresh size={16} />
          </ActionIcon>
          <ActionIcon variant="light">
            <IconSettings size={16} />
          </ActionIcon>
        </Group>
      </Group>

      {/* Stats */}
      {stats && (
        <Group gap="md" mb="md">
          {Object.entries(stats).map(([key, value]) => (
            <Box key={key}>
              <Text size="xs" c="dimmed">{key}</Text>
              <Text fw={500} size="sm">{value}</Text>
            </Box>
          ))}
        </Group>
      )}

      {/* Chart */}
      <ChartManager
        config={getChartConfig()}
        data={chartData}
        onDataRequest={loadIndicatorData}
        isEmbedded={false}
      />
    </Box>
  );
} 