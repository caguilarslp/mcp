/**
 * @fileoverview Market Data Handlers - MCP Tool Handlers for Market Data
 * @description Specialized handlers for market data operations
 * @version 1.3.7
 */

import { MarketAnalysisEngine } from '../../core/engine.js';
import { MCPServerResponse, MarketCategoryType } from '../../types/index.js';
import { FileLogger } from '../../utils/fileLogger.js';

export class MarketDataHandlers {
  constructor(
    private engine: MarketAnalysisEngine,
    private logger: FileLogger
  ) {}

  async handleGetTicker(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const category = (args?.category as MarketCategoryType) || 'spot';

    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const response = await this.engine.getMarketData(symbol, category);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch ticker data');
    }

    const ticker = response.data!.ticker;
    
    const formattedTicker = {
      symbol: ticker.symbol,
      precio_actual: `${ticker.lastPrice.toFixed(4)}`,
      cambio_24h: `${ticker.price24hPcnt.toFixed(2)}%`,
      maximo_24h: `${ticker.highPrice24h.toFixed(4)}`,
      minimo_24h: `${ticker.lowPrice24h.toFixed(4)}`,
      volumen_24h: ticker.volume24h.toString(),
      bid: `${ticker.bid1Price.toFixed(4)}`,
      ask: `${ticker.ask1Price.toFixed(4)}`,
      spread: `${(ticker.ask1Price - ticker.bid1Price).toFixed(4)}`,
      timestamp: ticker.timestamp
    };

    return this.createSuccessResponse(formattedTicker);
  }

  async handleGetOrderbook(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const category = (args?.category as MarketCategoryType) || 'spot';
    const limit = (args?.limit as number) || 25;

    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const response = await this.engine.getMarketData(symbol, category);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch orderbook data');
    }

    const orderbook = response.data!.orderbook;
    
    const formattedOrderbook = {
      symbol: orderbook.symbol,
      bids: orderbook.bids.slice(0, Math.min(limit, 10)).map(bid => ({
        precio: `$${bid.price.toFixed(4)}`,
        cantidad: bid.size.toString()
      })),
      asks: orderbook.asks.slice(0, Math.min(limit, 10)).map(ask => ({
        precio: `$${ask.price.toFixed(4)}`,
        cantidad: ask.size.toString()
      })),
      spread: `$${orderbook.spread.toFixed(4)}`,
      profundidad_bid: orderbook.bids.length,
      profundidad_ask: orderbook.asks.length,
      timestamp: orderbook.timestamp
    };

    return this.createSuccessResponse(formattedOrderbook);
  }

  async handleGetMarketData(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const category = (args?.category as MarketCategoryType) || 'spot';

    if (!symbol) {
      throw new Error('Symbol is required');
    }

    const response = await this.engine.getMarketData(symbol, category);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch market data');
    }

    const { ticker, orderbook, recentKlines } = response.data!;
    
    const formattedData = {
      ticker: {
        symbol: ticker.symbol,
        precio_actual: `$${ticker.lastPrice.toFixed(4)}`,
        cambio_24h: `${ticker.price24hPcnt.toFixed(2)}%`,
        volumen_24h: ticker.volume24h.toString(),
        timestamp: ticker.timestamp
      },
      orderbook: {
        spread: `$${orderbook.spread.toFixed(4)}`,
        bid_top: `$${orderbook.bids[0]?.price.toFixed(4)}`,
        ask_top: `$${orderbook.asks[0]?.price.toFixed(4)}`,
        liquidity_score: this.calculateLiquidityScore(orderbook)
      },
      price_action: {
        velas_recientes: recentKlines.slice(-5).length,
        rango_24h: {
          maximo: Math.max(...recentKlines.slice(-24).map(k => k.high)),
          minimo: Math.min(...recentKlines.slice(-24).map(k => k.low))
        },
        tendencia: this.calculatePriceTrend(recentKlines.slice(-10))
      }
    };

    return this.createSuccessResponse(formattedData);
  }

  private calculateLiquidityScore(orderbook: any): string {
    const spreadPercent = (orderbook.spread / ((orderbook.bids[0]?.price + orderbook.asks[0]?.price) / 2)) * 100;
    const depth = Math.min(orderbook.bids.length, orderbook.asks.length);
    
    let score: string;
    if (spreadPercent < 0.05 && depth > 20) {
      score = 'High';
    } else if (spreadPercent < 0.1 && depth > 10) {
      score = 'Medium';
    } else {
      score = 'Low';
    }
    
    return score;
  }

  private calculatePriceTrend(klines: any[]): string {
    if (klines.length < 2) return 'Unknown';
    
    const firstPrice = klines[0].close;
    const lastPrice = klines[klines.length - 1].close;
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;
    
    if (change > 2) return 'Strong Uptrend';
    if (change > 0.5) return 'Uptrend';
    if (change < -2) return 'Strong Downtrend';
    if (change < -0.5) return 'Downtrend';
    return 'Sideways';
  }

  private createSuccessResponse(data: any): MCPServerResponse {
    let cleanData: any;
    
    try {
      const jsonString = JSON.stringify(data, (key, value) => {
        if (typeof value === 'function' || value === undefined) {
          return '[FILTERED]';
        }
        if (typeof value === 'object' && value !== null) {
          if (value.constructor !== Object && value.constructor !== Array) {
            return '[COMPLEX_OBJECT]';
          }
        }
        return value;
      });
      
      cleanData = JSON.parse(jsonString);
    } catch (error) {
      cleanData = { result: 'Data serialization error', data: String(data) };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(cleanData, null, 2)
      }]
    };
  }
}
