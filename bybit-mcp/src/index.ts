#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

// Types para Bybit API
interface TickerData {
  symbol: string;
  lastPrice: string;
  price24hPcnt: string;
  highPrice24h: string;
  lowPrice24h: string;
  volume24h: string;
  bid1Price: string;
  ask1Price: string;
}

interface OrderbookLevel {
  price: string;
  size: string;
}

interface OrderbookData {
  symbol: string;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
}

interface GridSuggestion {
  symbol: string;
  currentPrice: number;
  suggestedRange: {
    lower: number;
    upper: number;
  };
  gridLevels: number[];
  investment: number;
  pricePerGrid: number;
  potentialProfit: string;
}

class BybitMCP {
  private server: Server;
  private baseUrl = 'https://api.bybit.com';

  constructor() {
    this.server = new Server(
      {
        name: 'bybit-mcp',
        version: '1.1.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_ticker',
            description: 'Obtener precio actual y estadísticas de un par de trading',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Par de trading (ej: BTCUSDT, XRPUSDT)',
                },
                category: {
                  type: 'string',
                  description: 'Categoría del mercado',
                  enum: ['spot', 'linear', 'inverse'],
                  default: 'spot',
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'get_orderbook',
            description: 'Obtener libro de órdenes para análisis de profundidad',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Par de trading',
                },
                category: {
                  type: 'string',
                  description: 'Categoría del mercado',
                  enum: ['spot', 'linear', 'inverse'],
                  default: 'spot',
                },
                limit: {
                  type: 'number',
                  description: 'Número de niveles del orderbook',
                  default: 25,
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'suggest_grid_levels',
            description: 'Sugerir niveles óptimos para grid trading basado en volatilidad',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Par de trading',
                },
                investment: {
                  type: 'number',
                  description: 'Cantidad a invertir en USD',
                },
                gridCount: {
                  type: 'number',
                  description: 'Número de grids deseados',
                  default: 10,
                },
                category: {
                  type: 'string',
                  description: 'Categoría del mercado',
                  enum: ['spot', 'linear', 'inverse'],
                  default: 'spot',
                },
              },
              required: ['symbol', 'investment'],
            },
          },
          {
            name: 'get_klines',
            description: 'Obtener datos de velas para análisis técnico',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Par de trading',
                },
                interval: {
                  type: 'string',
                  description: 'Intervalo de tiempo',
                  enum: ['1', '3', '5', '15', '30', '60', '120', '240', '360', '720', 'D', 'M', 'W'],
                  default: '60',
                },
                limit: {
                  type: 'number',
                  description: 'Número de velas',
                  default: 200,
                },
                category: {
                  type: 'string',
                  description: 'Categoría del mercado',
                  enum: ['spot', 'linear', 'inverse'],
                  default: 'spot',
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'analyze_volatility',
            description: 'Analizar volatilidad para determinar timing de grid',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Par de trading',
                },
                period: {
                  type: 'string',
                  description: 'Período de análisis',
                  enum: ['1h', '4h', '1d', '7d'],
                  default: '1d',
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'get_volume_analysis',
            description: 'Analizar volumen tradicional por períodos y detectar anomalías',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Par de trading',
                },
                interval: {
                  type: 'string',
                  description: 'Intervalo de tiempo',
                  enum: ['1', '5', '15', '30', '60', '240', 'D'],
                  default: '60',
                },
                periods: {
                  type: 'number',
                  description: 'Número de períodos a analizar',
                  default: 24,
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'get_volume_delta',
            description: 'Calcular Volume Delta (presión compradora vs vendedora)',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Par de trading',
                },
                interval: {
                  type: 'string',
                  description: 'Intervalo de tiempo',
                  enum: ['1', '5', '15', '30', '60'],
                  default: '5',
                },
                periods: {
                  type: 'number',
                  description: 'Número de períodos',
                  default: 60,
                },
              },
              required: ['symbol'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!args) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: No se proporcionaron argumentos para ${name}`,
            },
          ],
        };
      }

      try {
        switch (name) {
          case 'get_ticker':
            return await this.getTicker(args.symbol as string, (args.category as string) || 'spot');
          case 'get_orderbook':
            return await this.getOrderbook(args.symbol as string, (args.category as string) || 'spot', (args.limit as number) || 25);
          case 'suggest_grid_levels':
            return await this.suggestGridLevels(args.symbol as string, args.investment as number, (args.gridCount as number) || 10, (args.category as string) || 'spot');
          case 'get_klines':
            return await this.getKlines(args.symbol as string, (args.interval as string) || '60', (args.limit as number) || 200, (args.category as string) || 'spot');
          case 'analyze_volatility':
            return await this.analyzeVolatility(args.symbol as string, (args.period as string) || '1d');
          case 'get_volume_analysis':
            return await this.getVolumeAnalysis(args.symbol as string, (args.interval as string) || '60', (args.periods as number) || 24);
          case 'get_volume_delta':
            return await this.getVolumeDelta(args.symbol as string, (args.interval as string) || '5', (args.periods as number) || 60);
          default:
            throw new Error(`Tool ${name} no encontrado`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return {
          content: [
            {
              type: 'text',
              text: `Error ejecutando ${name}: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  private async makeRequest(endpoint: string): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: any = await response.json();
    
    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`);
    }
    
    return data.result;
  }

  private async getTicker(symbol: string, category: string) {
    const result = await this.makeRequest(`/v5/market/tickers?category=${category}&symbol=${symbol}`);
    const ticker = result.list[0] as TickerData;
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            symbol: ticker.symbol,
            precio_actual: `$${parseFloat(ticker.lastPrice).toFixed(4)}`,
            cambio_24h: `${parseFloat(ticker.price24hPcnt).toFixed(2)}%`,
            maximo_24h: `$${parseFloat(ticker.highPrice24h).toFixed(4)}`,
            minimo_24h: `$${parseFloat(ticker.lowPrice24h).toFixed(4)}`,
            volumen_24h: ticker.volume24h,
            bid: `$${parseFloat(ticker.bid1Price).toFixed(4)}`,
            ask: `$${parseFloat(ticker.ask1Price).toFixed(4)}`,
            spread: `$${(parseFloat(ticker.ask1Price) - parseFloat(ticker.bid1Price)).toFixed(4)}`
          }, null, 2),
        },
      ],
    };
  }

  private async getOrderbook(symbol: string, category: string, limit: number) {
    const result = await this.makeRequest(`/v5/market/orderbook?category=${category}&symbol=${symbol}&limit=${limit}`);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            symbol: result.s,
            bids: result.b.slice(0, 10).map((bid: string[]) => ({
              precio: `$${parseFloat(bid[0]).toFixed(4)}`,
              cantidad: bid[1]
            })),
            asks: result.a.slice(0, 10).map((ask: string[]) => ({
              precio: `$${parseFloat(ask[0]).toFixed(4)}`,
              cantidad: ask[1]
            })),
            spread: `$${(parseFloat(result.a[0][0]) - parseFloat(result.b[0][0])).toFixed(4)}`,
            profundidad_bid: result.b.length,
            profundidad_ask: result.a.length
          }, null, 2),
        },
      ],
    };
  }

  private async getKlines(symbol: string, interval: string, limit: number, category: string) {
    const result = await this.makeRequest(`/v5/market/kline?category=${category}&symbol=${symbol}&interval=${interval}&limit=${limit}`);
    
    const klines = result.list.map((kline: string[]) => ({
      timestamp: new Date(parseInt(kline[0])).toISOString(),
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5])
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            symbol,
            interval,
            datos_recientes: klines.slice(0, 5),
            total_velas: klines.length,
            rango_precio: {
              maximo: Math.max(...klines.map((k: any) => k.high)),
              minimo: Math.min(...klines.map((k: any) => k.low))
            }
          }, null, 2),
        },
      ],
    };
  }

  private async suggestGridLevels(symbol: string, investment: number, gridCount: number, category: string): Promise<any> {
    // Obtener precio actual y datos históricos
    const tickerResult = await this.makeRequest(`/v5/market/tickers?category=${category}&symbol=${symbol}`);
    const ticker = tickerResult.list[0];
    const currentPrice = parseFloat(ticker.lastPrice);
    
    // Obtener datos de volatilidad (últimas 24h)
    const klinesResult = await this.makeRequest(`/v5/market/kline?category=${category}&symbol=${symbol}&interval=60&limit=24`);
    const prices = klinesResult.list.map((kline: string[]) => parseFloat(kline[4])); // closing prices
    
    // Calcular volatilidad
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const volatilityRange = maxPrice - minPrice;
    const volatilityPercent = (volatilityRange / currentPrice) * 100;
    
    // Sugerir rango para grid (±15% del precio actual como base, ajustado por volatilidad)
    const baseRange = Math.max(0.1, volatilityPercent * 0.8); // Mínimo 10%, máximo basado en volatilidad
    const lowerBound = currentPrice * (1 - baseRange / 100);
    const upperBound = currentPrice * (1 + baseRange / 100);
    
    // Calcular niveles de grid
    const priceStep = (upperBound - lowerBound) / gridCount;
    const gridLevels = [];
    for (let i = 0; i <= gridCount; i++) {
      gridLevels.push(parseFloat((lowerBound + (priceStep * i)).toFixed(4)));
    }
    
    // Calcular inversión por grid
    const investmentPerGrid = investment / gridCount;
    
    // Estimar profit potencial (asumiendo 0.5% por trade completado)
    const avgProfitPerTrade = currentPrice * 0.005; // 0.5%
    const estimatedTrades = gridCount * 2; // Cada grid puede generar 2 trades (compra/venta)
    const potentialDailyProfit = avgProfitPerTrade * estimatedTrades * 0.3; // 30% de los trades por día

    const suggestion: GridSuggestion = {
      symbol,
      currentPrice,
      suggestedRange: {
        lower: parseFloat(lowerBound.toFixed(4)),
        upper: parseFloat(upperBound.toFixed(4))
      },
      gridLevels,
      investment,
      pricePerGrid: parseFloat(investmentPerGrid.toFixed(2)),
      potentialProfit: `$${potentialDailyProfit.toFixed(2)}/día estimado`
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            ...suggestion,
            volatilidad_24h: `${volatilityPercent.toFixed(2)}%`,
            recomendacion: volatilityPercent > 5 ? 'Alta volatilidad - Grid recomendado' : 'Baja volatilidad - Considerar esperar',
            configuracion_grid: {
              total_grids: gridCount,
              inversion_por_grid: `$${investmentPerGrid.toFixed(2)}`,
              rango_sugerido: `$${lowerBound.toFixed(4)} - $${upperBound.toFixed(4)}`,
              paso_precio: `$${priceStep.toFixed(4)}`
            }
          }, null, 2),
        },
      ],
    };
  }

  private async analyzeVolatility(symbol: string, period: string) {
    const intervalMap: Record<string, { interval: string; limit: number }> = {
      '1h': { interval: '1', limit: 60 },
      '4h': { interval: '4', limit: 60 },
      '1d': { interval: '60', limit: 24 },
      '7d': { interval: 'D', limit: 7 }
    };
    
    const config = intervalMap[period] || intervalMap['1d'];
    const result = await this.makeRequest(`/v5/market/kline?category=spot&symbol=${symbol}&interval=${config.interval}&limit=${config.limit}`);
    
    const prices = result.list.map((kline: string[]) => ({
      timestamp: new Date(parseInt(kline[0])).toISOString(),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4])
    }));
    
    const currentPrice = prices[0].close;
    const highestPrice = Math.max(...prices.map((p: any) => p.high));
    const lowestPrice = Math.min(...prices.map((p: any) => p.low));
    const volatilityRange = highestPrice - lowestPrice;
    const volatilityPercent = (volatilityRange / currentPrice) * 100;
    
    // Calcular si es buen momento para grid
    const isGoodForGrid = volatilityPercent > 3 && volatilityPercent < 20; // Entre 3% y 20% es ideal
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            symbol,
            periodo_analisis: period,
            precio_actual: `$${currentPrice.toFixed(4)}`,
            precio_maximo: `$${highestPrice.toFixed(4)}`,
            precio_minimo: `$${lowestPrice.toFixed(4)}`,
            volatilidad: `${volatilityPercent.toFixed(2)}%`,
            evaluacion: {
              bueno_para_grid: isGoodForGrid,
              razon: isGoodForGrid 
                ? 'Volatilidad óptima para grid trading' 
                : volatilityPercent < 3 
                  ? 'Muy poca volatilidad - considera esperar' 
                  : 'Demasiada volatilidad - alto riesgo',
              recomendacion: isGoodForGrid 
                ? 'Proceder con grid trading' 
                : 'Esperar mejor momento'
            },
            datos_historicos: prices.slice(0, 5)
          }, null, 2),
        },
      ],
    };
  }

  private async getVolumeAnalysis(symbol: string, interval: string, periods: number) {
    const result = await this.makeRequest(`/v5/market/kline?category=spot&symbol=${symbol}&interval=${interval}&limit=${periods}`);
    
    const volumeData = result.list.map((kline: string[]) => ({
      timestamp: new Date(parseInt(kline[0])).toISOString(),
      volume: parseFloat(kline[5]),
      price: parseFloat(kline[4]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      priceRange: parseFloat(kline[2]) - parseFloat(kline[3])
    }));
    
    // Calcular estadísticas de volumen
    const volumes = volumeData.map((d: any) => d.volume);
    const avgVolume = volumes.reduce((sum: number, vol: number) => sum + vol, 0) / volumes.length;
    const maxVolume = Math.max(...volumes);
    const minVolume = Math.min(...volumes);
    
    // Detectar picos de volumen (>1.5x promedio)
    const volumeSpikes = volumeData.filter((d: any) => d.volume > avgVolume * 1.5);
    
    // Análisis de volumen por precio (Volume Profile básico)
    const priceRanges = volumeData.map((d: any) => ({
      price: d.price,
      volume: d.volume,
      level: d.price > volumeData[0].price ? 'resistance' : 'support'
    }));
    
    // Calcular Volume-Weighted Average Price (VWAP)
    let cumulativeVolume = 0;
    let cumulativePriceVolume = 0;
    const vwapData = volumeData.map((d: any) => {
      cumulativeVolume += d.volume;
      cumulativePriceVolume += d.price * d.volume;
      return {
        timestamp: d.timestamp,
        vwap: cumulativePriceVolume / cumulativeVolume
      };
    });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            symbol,
            interval,
            analisis_volumen: {
              volumen_promedio: avgVolume.toFixed(2),
              volumen_maximo: maxVolume.toFixed(2),
              volumen_minimo: minVolume.toFixed(2),
              volumen_actual: volumeData[0].volume.toFixed(2),
              comparacion_promedio: `${((volumeData[0].volume / avgVolume) * 100).toFixed(0)}%`
            },
            picos_volumen: volumeSpikes.slice(0, 5).map((spike: any) => ({
              tiempo: spike.timestamp,
              volumen: spike.volume.toFixed(2),
              multiplicador: `${(spike.volume / avgVolume).toFixed(1)}x promedio`,
              precio: `${spike.price.toFixed(4)}`
            })),
            vwap: {
              actual: `${vwapData[0].vwap.toFixed(4)}`,
              precio_vs_vwap: volumeData[0].price > vwapData[0].vwap ? 'Por encima' : 'Por debajo',
              diferencia: `${((volumeData[0].price - vwapData[0].vwap) / vwapData[0].vwap * 100).toFixed(2)}%`
            },
            tendencia_volumen: {
              ultimas_5_velas: volumes.slice(0, 5).map((v: number) => v.toFixed(2)),
              tendencia: volumes[0] > volumes[4] ? 'Incrementando' : 'Disminuyendo'
            }
          }, null, 2),
        },
      ],
    };
  }

  private async getVolumeDelta(symbol: string, interval: string, periods: number) {
    // Obtener datos de klines
    const klinesResult = await this.makeRequest(`/v5/market/kline?category=spot&symbol=${symbol}&interval=${interval}&limit=${periods}`);
    
    // Para Volume Delta necesitamos aproximar basándonos en la acción del precio
    // En un escenario real con API key, usaríamos trades individuales
    const volumeDeltas = klinesResult.list.map((kline: string[]) => {
      const timestamp = parseInt(kline[0]);
      const open = parseFloat(kline[1]);
      const high = parseFloat(kline[2]);
      const low = parseFloat(kline[3]);
      const close = parseFloat(kline[4]);
      const volume = parseFloat(kline[5]);
      
      // Método de aproximación: usar la posición del cierre respecto al rango
      const range = high - low;
      const closePosition = range > 0 ? (close - low) / range : 0.5;
      
      // Si el cierre está en la parte superior del rango, más volumen fue de compra
      const buyVolume = volume * closePosition;
      const sellVolume = volume * (1 - closePosition);
      const delta = buyVolume - sellVolume;
      
      // Indicador adicional: si close > open, sesgo alcista
      const candleDirection = close > open ? 'bullish' : close < open ? 'bearish' : 'neutral';
      
      return {
        timestamp: new Date(timestamp).toISOString(),
        buyVolume,
        sellVolume,
        delta,
        totalVolume: volume,
        closePosition: (closePosition * 100).toFixed(0) + '%',
        candleDirection,
        price: close
      };
    });
    
    // Calcular Delta Acumulativo
    let cumulativeDelta = 0;
    volumeDeltas.forEach((delta: any) => {
      cumulativeDelta += delta.delta;
      delta.cumulativeDelta = cumulativeDelta;
    });
    
    // Análisis de tendencia del delta
    const recentDeltas = volumeDeltas.slice(0, 10);
    const avgDelta = recentDeltas.reduce((sum: number, d: any) => sum + d.delta, 0) / recentDeltas.length;
    const positiveDeltaCount = recentDeltas.filter((d: any) => d.delta > 0).length;
    
    // Detectar divergencias (precio sube pero delta baja o viceversa)
    const priceTrend = volumeDeltas[0].price > volumeDeltas[9].price ? 'up' : 'down';
    const deltaTrend = volumeDeltas[0].cumulativeDelta > volumeDeltas[9].cumulativeDelta ? 'up' : 'down';
    const divergence = priceTrend !== deltaTrend;
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            symbol,
            interval,
            volume_delta_reciente: {
              delta_actual: volumeDeltas[0].delta.toFixed(2),
              delta_promedio_10: avgDelta.toFixed(2),
              sesgo: avgDelta > 0 ? 'Comprador' : 'Vendedor',
              fuerza_sesgo: `${Math.abs(avgDelta / volumeDeltas[0].totalVolume * 100).toFixed(1)}%`
            },
            presion_mercado: {
              ultimas_10_velas: `${positiveDeltaCount} alcistas, ${10 - positiveDeltaCount} bajistas`,
              porcentaje_alcista: `${(positiveDeltaCount / 10 * 100).toFixed(0)}%`,
              tendencia: positiveDeltaCount >= 7 ? 'Fuerte presión compradora' : 
                        positiveDeltaCount <= 3 ? 'Fuerte presión vendedora' : 'Mercado equilibrado'
            },
            delta_acumulativo: {
              actual: cumulativeDelta.toFixed(2),
              tendencia: deltaTrend === 'up' ? 'Ascendente' : 'Descendente',
              cambio_10_periodos: (volumeDeltas[0].cumulativeDelta - volumeDeltas[9].cumulativeDelta).toFixed(2)
            },
            divergencias: {
              detectada: divergence,
              tipo: divergence ? `Precio ${priceTrend === 'up' ? 'sube' : 'baja'} pero delta ${deltaTrend === 'up' ? 'sube' : 'baja'}` : 'Sin divergencia',
              señal: divergence ? (deltaTrend === 'down' && priceTrend === 'up' ? 'Posible reversión bajista' : 'Posible reversión alcista') : 'Tendencia confirmada'
            },
            ultimos_5_deltas: volumeDeltas.slice(0, 5).map((d: any) => ({
              tiempo: d.timestamp,
              delta: d.delta.toFixed(2),
              direccion: d.candleDirection,
              volumen_total: d.totalVolume.toFixed(2)
            }))
          }, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Bybit MCP Server funcionando...');
  }
}

// Start the server
const server = new BybitMCP();
server.run().catch(console.error);
