import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import type { ChartData } from '../components/Charts/ChartManager';

interface UseChartDataOptions {
  symbol: string;
  timeframe?: string;
  indicators?: string[];
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface ChartDataState {
  data: ChartData;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

export function useChartData({
  symbol,
  timeframe = '60',
  indicators = [],
  autoRefresh = false,
  refreshInterval = 30000 // 30 seconds
}: UseChartDataOptions) {
  const [state, setState] = useState<ChartDataState>({
    data: {},
    isLoading: false,
    error: null,
    lastUpdate: null
  });

  // Load chart data from API
  const loadData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get basic market data
      const marketResponse = await apiService.getMarketData(symbol);
      
      if (!marketResponse.success || !marketResponse.data) {
        throw new Error(marketResponse.error || 'Failed to fetch market data');
      }

      const marketData = marketResponse.data;
      const chartData: ChartData = {};

      // Convert candlestick data
      if (marketData.klines) {
        chartData.candlesticks = marketData.klines.map((kline: any) => ({
          time: new Date(kline.timestamp).getTime() / 1000,
          open: kline.open,
          high: kline.high,
          low: kline.low,
          close: kline.close
        }));

        // Convert volume data
        chartData.volume = marketData.klines.map((kline: any) => ({
          time: new Date(kline.timestamp).getTime() / 1000,
          value: kline.volume,
          color: kline.close > kline.open ? '#3fb950' : '#f85149'
        }));
      }

      // Load requested indicators
      if (indicators.length > 0) {
        chartData.indicators = {};
        
        for (const indicator of indicators) {
          try {
            let indicatorResponse;
            
            switch (indicator.toLowerCase()) {
              case 'vwap':
                indicatorResponse = await apiService.executeMCPTool('analyze_volume', {
                  symbol,
                  timeframe
                });
                
                if (indicatorResponse.success && indicatorResponse.data?.vwap) {
                  chartData.indicators.VWAP = indicatorResponse.data.vwap.map((point: any) => ({
                    time: new Date(point.timestamp).getTime() / 1000,
                    value: point.price
                  }));
                }
                break;

              case 'bollinger':
                indicatorResponse = await apiService.executeMCPTool('analyze_bollinger_bands', {
                  symbol,
                  timeframe
                });
                
                if (indicatorResponse.success && indicatorResponse.data?.bands) {
                  const bands = indicatorResponse.data.bands;
                  chartData.indicators['Bollinger Upper'] = bands.map((point: any) => ({
                    time: new Date(point.timestamp).getTime() / 1000,
                    value: point.upper
                  }));
                  chartData.indicators['Bollinger Middle'] = bands.map((point: any) => ({
                    time: new Date(point.timestamp).getTime() / 1000,
                    value: point.middle
                  }));
                  chartData.indicators['Bollinger Lower'] = bands.map((point: any) => ({
                    time: new Date(point.timestamp).getTime() / 1000,
                    value: point.lower
                  }));
                }
                break;

              case 'volume_delta':
                indicatorResponse = await apiService.executeMCPTool('analyze_volume_delta', {
                  symbol,
                  timeframe
                });
                
                if (indicatorResponse.success && indicatorResponse.data?.volumeDelta) {
                  chartData.indicators['Volume Delta'] = indicatorResponse.data.volumeDelta.map((point: any) => ({
                    time: new Date(point.timestamp).getTime() / 1000,
                    value: point.delta
                  }));
                }
                break;
            }
          } catch (indicatorError) {
            console.warn(`Failed to load indicator ${indicator}:`, indicatorError);
          }
        }
      }

      // Load overlays (SMC data)
      try {
        const smcResponse = await apiService.executeMCPTool('detect_order_blocks', {
          symbol,
          timeframe
        });

        if (smcResponse.success && smcResponse.data) {
          chartData.overlays = {
            orderBlocks: smcResponse.data.orderBlocks || [],
            fvgs: smcResponse.data.fvgs || [],
            supportResistance: smcResponse.data.supportResistance || []
          };
        }
      } catch (overlayError) {
        console.warn('Failed to load overlays:', overlayError);
      }

      setState({
        data: chartData,
        isLoading: false,
        error: null,
        lastUpdate: new Date()
      });

    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load chart data'
      }));
    }
  }, [symbol, timeframe, indicators]);

  // Refresh data manually
  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(loadData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadData]);

  // Load data on mount and dependency changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    ...state,
    refresh,
    isRefreshing: state.isLoading
  };
}

// Hook for real-time WebSocket data
export function useRealTimeChartData(symbol: string) {
  const [realtimeData, setRealtimeData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // WebSocket connection for real-time data
    // This would connect to your WebSocket endpoint
    const ws = new WebSocket(`ws://localhost:8000/ws/market/${symbol}`);
    
    ws.onopen = () => {
      setIsConnected(true);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setRealtimeData(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    ws.onclose = () => {
      setIsConnected(false);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [symbol]);

  return {
    data: realtimeData,
    isConnected
  };
} 