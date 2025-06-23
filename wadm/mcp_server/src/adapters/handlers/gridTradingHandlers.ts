/**
 * @fileoverview Grid Trading Handlers - Grid level suggestions and analysis
 * @description Handles grid trading level calculations and recommendations
 * @version 1.0.0
 */

import { MarketAnalysisEngine } from '../../core/engine.js';
import { MCPServerResponse, MarketCategoryType } from '../../types/index.js';
import { FileLogger } from '../../utils/fileLogger.js';

export class GridTradingHandlers {
  constructor(
    private readonly engine: MarketAnalysisEngine,
    private readonly logger: FileLogger
  ) {}

  async handleSuggestGridLevels(args: any): Promise<MCPServerResponse> {
    const symbol = args?.symbol as string;
    const investment = args?.investment as number;
    const gridCount = (args?.gridCount as number) || 10;
    const category = (args?.category as MarketCategoryType) || 'spot';
    const riskTolerance = (args?.riskTolerance as 'low' | 'medium' | 'high') || 'medium';
    const optimize = (args?.optimize as boolean) || false;

    if (!symbol || !investment) {
      throw new Error('Symbol and investment are required');
    }

    const response = await this.engine.getGridTradingSuggestions(symbol, investment, {
      gridCount,
      category,
      riskTolerance,
      optimize
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to suggest grid levels');
    }

    const gridSuggestion = response.data!;
    
    let formattedSuggestion: any;

    if (optimize) {
      // Optimized suggestion format
      formattedSuggestion = {
        symbol,
        optimized: true,
        optimal_grid_count: gridSuggestion.optimalGridCount,
        suggested_range: {
          lower: `$${gridSuggestion.optimalRange.lower.toFixed(4)}`,
          upper: `$${gridSuggestion.optimalRange.upper.toFixed(4)}`
        },
        expected_return: `${gridSuggestion.expectedReturn.toFixed(2)}%`,
        risk_score: gridSuggestion.riskScore.toFixed(1),
        risk_tolerance: riskTolerance,
        investment: `$${investment}`
      };
    } else {
      // Standard suggestion format
      formattedSuggestion = {
        symbol,
        current_price: `$${gridSuggestion.currentPrice.toFixed(4)}`,
        suggested_range: {
          lower: `$${gridSuggestion.suggestedRange.lower.toFixed(4)}`,
          upper: `$${gridSuggestion.suggestedRange.upper.toFixed(4)}`
        },
        grid_levels: gridSuggestion.gridLevels.map((level: number) => `${level.toFixed(4)}`),
        investment: `$${gridSuggestion.investment}`,
        price_per_grid: `$${gridSuggestion.pricePerGrid.toFixed(2)}`,
        potential_profit: gridSuggestion.potentialProfit,
        volatility_24h: `${gridSuggestion.volatility24h.toFixed(2)}%`,
        recommendation: gridSuggestion.recommendation === 'recommended' ? 'Recomendado' :
                        gridSuggestion.recommendation === 'wait' ? 'Esperar' : 'Alto riesgo',
        confidence: `${gridSuggestion.confidence}%`
      };
    }

    return this.createSuccessResponse(formattedSuggestion);
  }

  private createSuccessResponse(data: any): MCPServerResponse {
    // Ensure clean JSON serialization without complex objects
    let cleanData: any;
    
    try {
      // Convert to JSON and back to ensure clean serialization
      const jsonString = JSON.stringify(data, (key, value) => {
        // Filter out potentially problematic values
        if (typeof value === 'function' || value === undefined) {
          return '[FILTERED]';
        }
        if (typeof value === 'object' && value !== null) {
          // Ensure objects are plain and serializable
          if (value.constructor !== Object && value.constructor !== Array) {
            return '[COMPLEX_OBJECT]';
          }
        }
        return value;
      });
      
      cleanData = JSON.parse(jsonString);
    } catch (error) {
      // Fallback to simple string representation
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
