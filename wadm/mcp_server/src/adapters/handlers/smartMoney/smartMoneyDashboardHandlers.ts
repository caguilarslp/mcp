/**
 * @fileoverview Smart Money Dashboard Handlers
 * @description MCP handlers for Smart Money Concepts dashboard and confluence analysis
 * @version 1.0.0
 * @author wAIckoff Team
 */

import type {
  MCPServerResponse,
  IMarketDataService,
  IAnalysisService
} from '../../../types/index.js';

import {
  SmartMoneyDashboardService,
  type SMCDashboard,
  type SMCTradingSetup,
  type SMCConfluenceStrength
} from '../../../services/smartMoney/smartMoneyDashboard.js';

export class SmartMoneyDashboardHandlers {
  private dashboardService: SmartMoneyDashboardService;

  constructor(
    marketDataService: IMarketDataService,
    analysisService: IAnalysisService
  ) {
    this.dashboardService = new SmartMoneyDashboardService(marketDataService, analysisService);
  }

  /**
   * Get comprehensive SMC dashboard
   */
  async getSMCDashboard(args: {
    symbol: string;
    timeframe?: string;
  }): Promise<MCPServerResponse> {
    try {
      const { symbol, timeframe = '60' } = args;

      if (!symbol) {
        throw new Error('Symbol is required');
      }

      const dashboard = await this.dashboardService.getSMCDashboard(symbol, timeframe);

      const response = {
        dashboard: this.formatDashboard(dashboard),
        summary: this.generateDashboardSummary(dashboard),
        alerts: dashboard.alerts,
        metadata: {
          symbol,
          timeframe,
          analysisTime: `${dashboard.performanceMetrics.analysisTime.toFixed(2)}ms`,
          timestamp: dashboard.timestamp,
          version: '1.0.0'
        }
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };

    } catch (error) {
      throw new Error(`Dashboard analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get optimal trading setup
   */
  async getSMCTradingSetup(args: {
    symbol: string;
    timeframe?: string;
    preferredDirection?: 'long' | 'short';
  }): Promise<MCPServerResponse> {
    try {
      const { symbol, timeframe = '60', preferredDirection } = args;

      if (!symbol) {
        throw new Error('Symbol is required');
      }

      const setup = await this.dashboardService.getSMCTradingSetup(
        symbol,
        timeframe,
        preferredDirection
      );

      const response = {
        setup: this.formatTradingSetup(setup),
        summary: this.generateSetupSummary(setup),
        riskProfile: this.generateRiskProfile(setup),
        metadata: {
          symbol,
          timeframe,
          setupId: setup.id,
          timestamp: setup.timestamp
        }
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };

    } catch (error) {
      throw new Error(`Trading setup analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze confluence strength
   */
  async analyzeSMCConfluenceStrength(args: {
    symbol: string;
    timeframe?: string;
  }): Promise<MCPServerResponse> {
    try {
      const { symbol, timeframe = '60' } = args;

      if (!symbol) {
        throw new Error('Symbol is required');
      }

      const confluenceStrength = await this.dashboardService.analyzeSMCConfluenceStrength(
        symbol,
        timeframe
      );

      const response = {
        confluenceAnalysis: this.formatConfluenceStrength(confluenceStrength),
        summary: this.generateConfluenceSummary(confluenceStrength),
        keyZones: confluenceStrength.keyZones,
        recommendations: confluenceStrength.recommendations,
        metadata: {
          symbol,
          timeframe,
          timestamp: confluenceStrength.timestamp,
          overallStrength: confluenceStrength.overallStrength
        }
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };

    } catch (error) {
      throw new Error(`Confluence analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ====================
  // FORMATTING METHODS
  // ====================

  private formatDashboard(dashboard: SMCDashboard): any {
    return {
      marketOverview: {
        currentPrice: dashboard.currentPrice,
        marketBias: `${dashboard.marketOverview.bias.direction.toUpperCase()} (${dashboard.marketOverview.bias.strength}%)`,
        institutionalActivity: `${dashboard.marketOverview.institutionalActivity}%`,
        currentZone: dashboard.marketOverview.currentZone.toUpperCase(),
        volatility: dashboard.marketOverview.volatility.toUpperCase()
      },
      
      keyMetrics: {
        activeOrderBlocks: dashboard.keyMetrics.activeOrderBlocks,
        openFVGs: dashboard.keyMetrics.openFVGs,
        recentBOS: dashboard.keyMetrics.recentBOS,
        confluenceScore: `${dashboard.keyMetrics.confluenceScore}/100`,
        setupQuality: `${dashboard.keyMetrics.setupQuality}/100`
      },

      criticalLevels: dashboard.levelAnalysis.criticalLevels
        .slice(0, 8)
        .map(level => ({
          price: level.price,
          type: level.type,
          strength: `${level.strength}%`,
          distance: `${level.distance.toFixed(2)}%`,
          hasConfluence: level.confluence
        })),

      tradingRecommendation: dashboard.tradingAnalysis.primarySetup ? {
        action: dashboard.tradingAnalysis.primarySetup.direction.toUpperCase(),
        entryZone: `${dashboard.tradingAnalysis.primarySetup.entryZone.min} - ${dashboard.tradingAnalysis.primarySetup.entryZone.max}`,
        confidence: `${dashboard.tradingAnalysis.primarySetup.confidence}%`,
        riskReward: `1:${dashboard.tradingAnalysis.primarySetup.riskReward.toFixed(2)}`
      } : {
        action: 'WAIT',
        reason: 'No high-probability setup identified'
      }
    };
  }

  private formatTradingSetup(setup: SMCTradingSetup): any {
    return {
      setupOverview: {
        direction: setup.setupType.toUpperCase(),
        quality: setup.setupQuality.toUpperCase(),
        confidence: `${setup.confidence}%`
      },
      entryPlan: {
        optimalEntry: setup.entryAnalysis.optimalEntry,
        entryZone: `${setup.entryAnalysis.entryZone.min} - ${setup.entryAnalysis.entryZone.max}`,
        distanceToEntry: `${setup.entryAnalysis.distanceToEntry.toFixed(2)}%`
      },
      riskManagement: {
        stopLoss: setup.riskManagement.stopLoss,
        takeProfits: setup.riskManagement.takeProfits,
        riskRewardRatio: `1:${setup.riskManagement.riskRewardRatio.toFixed(2)}`
      }
    };
  }

  private formatConfluenceStrength(strength: SMCConfluenceStrength): any {
    return {
      overallStrength: `${strength.overallStrength}/100`,
      rating: strength.strengthRating.replace('_', ' ').toUpperCase(),
      confluenceBreakdown: strength.confluenceBreakdown,
      strengthFactors: strength.strengthFactors
    };
  }

  // ====================
  // SUMMARY METHODS
  // ====================

  private generateDashboardSummary(dashboard: SMCDashboard): string {
    const bias = dashboard.marketOverview.bias;
    const institutional = dashboard.marketOverview.institutionalActivity;
    const confluences = dashboard.confluenceAnalysis.totalConfluences;
    
    return `${dashboard.symbol} shows ${bias.direction.toUpperCase()} bias (${bias.strength}%) with ${institutional}% institutional activity. ${confluences} SMC confluences detected. Current zone: ${dashboard.marketOverview.currentZone.toUpperCase()}.`;
  }

  private generateSetupSummary(setup: SMCTradingSetup): string {
    return `${setup.setupQuality.toUpperCase()} quality ${setup.setupType.toUpperCase()} setup with ${setup.confidence}% confidence. Risk:Reward ratio of 1:${setup.riskManagement.riskRewardRatio.toFixed(2)}.`;
  }

  private generateConfluenceSummary(strength: SMCConfluenceStrength): string {
    return `Overall confluence strength: ${strength.overallStrength}/100 (${strength.strengthRating.replace('_', ' ')}). ${strength.confluenceBreakdown.total} total confluences with ${strength.confluenceBreakdown.byStrength.strong + strength.confluenceBreakdown.byStrength.veryStrong} strong confluences.`;
  }

  private generateRiskProfile(setup: SMCTradingSetup): any {
    return {
      riskLevel: setup.setupQuality === 'premium' ? 'LOW' : setup.setupQuality === 'standard' ? 'MEDIUM' : 'HIGH',
      maxRisk: `${setup.riskManagement.maxRisk}%`,
      positionSize: `${setup.riskManagement.positionSize.toFixed(2)}x`,
      stopLoss: setup.riskManagement.stopLoss,
      invalidationLevel: setup.monitoring.invalidationLevel
    };
  }

  private getActivityLevel(score: number): string {
    if (score >= 80) return 'Very High';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Moderate';
    if (score >= 20) return 'Low';
    return 'Very Low';
  }
}