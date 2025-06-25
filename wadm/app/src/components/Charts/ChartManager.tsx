import { useEffect, useRef, useCallback, useState } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import type { 
  IChartApi, 
  ISeriesApi, 
  CandlestickData,
  LineData,
  HistogramData
} from 'lightweight-charts';
import { Box, Paper, Group, Text, Badge, ActionIcon, Menu } from '@mantine/core';
import { 
  IconSettings, 
  IconMaximize, 
  IconDownload,
  IconPhoto,
  IconChartLine
} from '@tabler/icons-react';

export interface ChartConfig {
  type: 'candlestick' | 'line' | 'area' | 'volume' | 'indicator';
  symbol: string;
  timeframe: string;
  height?: number;
  width?: number;
  showToolbar?: boolean;
  showWatermark?: boolean;
  theme?: 'dark' | 'light';
  indicators?: string[];
  overlays?: any[];
}

export interface ChartData {
  candlesticks?: CandlestickData[];
  volume?: HistogramData[];
  indicators?: {
    [key: string]: LineData[] | HistogramData[];
  };
  overlays?: {
    orderBlocks?: any[];
    fvgs?: any[];
    supportResistance?: any[];
    wyckoffEvents?: any[];
  };
}

interface ChartManagerProps {
  config: ChartConfig;
  data: ChartData;
  onDataRequest?: (symbol: string, timeframe: string) => void;
  onIndicatorToggle?: (indicator: string, enabled: boolean) => void;
  isEmbedded?: boolean; // Para uso en chat vs dashboard
  className?: string;
}

export function ChartManager({ 
  config, 
  data, 
  onDataRequest,
  // onIndicatorToggle,
  isEmbedded = false,
  className 
}: ChartManagerProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<{
    candlestick?: ISeriesApi<'Candlestick'>;
    volume?: ISeriesApi<'Histogram'>;
    indicators: Map<string, ISeriesApi<any>>;
  }>({
    indicators: new Map()
  });

  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Chart theme configuration
  const getChartTheme = useCallback(() => {
    const isDark = config.theme === 'dark';
    return {
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#0d1117' : '#ffffff' },
        textColor: isDark ? '#c9d1d9' : '#333333',
      },
      grid: {
        vertLines: { color: isDark ? '#30363d' : '#e1e4e8' },
        horzLines: { color: isDark ? '#30363d' : '#e1e4e8' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      priceScale: {
        borderColor: isDark ? '#30363d' : '#e1e4e8',
      },
      timeScale: {
        borderColor: isDark ? '#30363d' : '#e1e4e8',
        timeVisible: true,
        secondsVisible: false,
      },
    };
  }, [config.theme]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      ...getChartTheme(),
      width: config.width || chartContainerRef.current.clientWidth,
      height: config.height || (isEmbedded ? 300 : 500),
      rightPriceScale: {
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      leftPriceScale: {
        visible: true,
      },
      watermark: config.showWatermark ? {
        visible: true,
        fontSize: 24,
        horzAlign: 'left',
        vertAlign: 'top',
        color: 'rgba(171, 71, 188, 0.3)',
        text: `WADM - ${config.symbol}`,
      } : undefined,
    });

    chartRef.current = chart;

    // Create main candlestick series
    if (config.type === 'candlestick' && data.candlesticks) {
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#3fb950',
        downColor: '#f85149',
        borderDownColor: '#f85149',
        borderUpColor: '#3fb950',
        wickDownColor: '#f85149',
        wickUpColor: '#3fb950',
      });
      
      candlestickSeries.setData(data.candlesticks);
      seriesRef.current.candlestick = candlestickSeries;
    }

    // Add volume series
    if (data.volume) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#58a6ff',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'left',
      });
      
      volumeSeries.setData(data.volume);
      seriesRef.current.volume = volumeSeries;
    }

    // Add indicators
    if (data.indicators) {
      Object.entries(data.indicators).forEach(([name, indicatorData]) => {
        const series = chart.addLineSeries({
          color: getIndicatorColor(name),
          lineWidth: 2,
          title: name,
        });
        
        series.setData(indicatorData as LineData[]);
        seriesRef.current.indicators.set(name, series);
      });
    }

    // Add overlays (order blocks, FVGs, etc.)
    if (data.overlays) {
      addOverlays(chart, data.overlays);
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [config, getChartTheme, isEmbedded]);

  // Update data when props change
  useEffect(() => {
    if (!chartRef.current) return;

    setIsLoading(true);
    
    // Update candlestick data
    if (data.candlesticks && seriesRef.current.candlestick) {
      seriesRef.current.candlestick.setData(data.candlesticks);
    }

    // Update volume data
    if (data.volume && seriesRef.current.volume) {
      seriesRef.current.volume.setData(data.volume);
    }

    // Update indicators
    if (data.indicators) {
      Object.entries(data.indicators).forEach(([name, indicatorData]) => {
        const series = seriesRef.current.indicators.get(name);
        if (series) {
          series.setData(indicatorData as LineData[]);
        }
      });
    }

    setLastUpdate(new Date());
    setIsLoading(false);
  }, [data]);

  // Helper functions
  const getIndicatorColor = (name: string): string => {
    const colors = {
      'VWAP': '#d29922',
      'EMA20': '#58a6ff',
      'EMA50': '#f85149',
      'RSI': '#a5a5a5',
      'MACD': '#3fb950',
      'Volume Delta': '#bc8cff',
    };
    return colors[name as keyof typeof colors] || '#c9d1d9';
  };

  const addOverlays = (_chart: IChartApi, overlays: any) => {
    // Add order blocks as rectangles
    if (overlays.orderBlocks) {
      overlays.orderBlocks.forEach((_block: any) => {
        // Implementation would add rectangles to chart
        // This requires custom drawing or using chart markers
      });
    }

    // Add FVGs as highlighted areas
    if (overlays.fvgs) {
      overlays.fvgs.forEach((_fvg: any) => {
        // Implementation would add FVG visualization
      });
    }

    // Add support/resistance lines
    if (overlays.supportResistance) {
      overlays.supportResistance.forEach((_level: any) => {
        // Implementation would add horizontal lines
      });
    }
  };

  const handleExportChart = () => {
    if (chartRef.current) {
      // const canvas = chartRef.current.takeScreenshot();
      // Implementation for downloading chart image
      console.log('Export chart functionality');
    }
  };

  const handleRequestData = () => {
    if (onDataRequest) {
      setIsLoading(true);
      onDataRequest(config.symbol, config.timeframe);
    }
  };

  return (
    <Paper 
      shadow={isEmbedded ? "none" : "sm"} 
      p={isEmbedded ? 0 : "md"} 
      className={className}
      style={{ position: 'relative' }}
    >
      {config.showToolbar && !isEmbedded && (
        <Group justify="space-between" mb="sm">
          <Group>
            <Text fw={500}>{config.symbol}</Text>
            <Badge variant="light" size="sm">
              {config.timeframe}
            </Badge>
            {isLoading && (
              <Badge color="blue" variant="dot" size="sm">
                Loading...
              </Badge>
            )}
          </Group>
          
          <Group gap="xs">
            <Text size="xs" c="dimmed">
              Last update: {lastUpdate.toLocaleTimeString()}
            </Text>
            
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon variant="light" size="sm">
                  <IconSettings size={14} />
                </ActionIcon>
              </Menu.Target>
              
              <Menu.Dropdown>
                <Menu.Item 
                  leftSection={<IconPhoto size={14} />}
                  onClick={handleExportChart}
                >
                  Export as Image
                </Menu.Item>
                <Menu.Item 
                  leftSection={<IconChartLine size={14} />}
                  onClick={handleRequestData}
                >
                  Refresh Data
                </Menu.Item>
                <Menu.Item 
                  leftSection={<IconMaximize size={14} />}
                >
                  Fullscreen
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      )}
      
      <Box
        ref={chartContainerRef}
        style={{
          width: '100%',
          height: config.height || (isEmbedded ? 300 : 500),
          position: 'relative'
        }}
      />
      
      {isEmbedded && (
        <Box 
          style={{ 
            position: 'absolute', 
            top: 8, 
            right: 8,
            zIndex: 1000 
          }}
        >
          <ActionIcon 
            variant="filled" 
            size="sm" 
            onClick={handleExportChart}
            style={{ opacity: 0.7 }}
          >
            <IconDownload size={12} />
          </ActionIcon>
        </Box>
      )}
    </Paper>
  );
} 