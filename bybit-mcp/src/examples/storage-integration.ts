/**
 * Storage Integration Example
 * Shows how to integrate storage with existing analysis services
 */

import { storageService } from '../services/storage';
import { 
  IAnalysisService, 
  VolatilityAnalysis,
  VolumeAnalysis,
  VolumeDelta,
  SupportResistanceAnalysis 
} from '../types';

interface AnalysisResult {
  timestamp: number;
  symbol: string;
  category?: string;
  price: number;
  analysis: {
    volatility?: VolatilityAnalysis;
    volume?: VolumeAnalysis;
    volumeDelta?: VolumeDelta;
    supportResistance?: SupportResistanceAnalysis;
  };
  metadata?: {
    version: string;
    source: string;
  };
}

/**
 * Example: Auto-save analysis results
 */
export async function saveAnalysisWithStorage(
  analysisService: IAnalysisService,
  symbol: string,
  category: string = 'spot'
): Promise<void> {
  try {
    // Perform individual analyses
    const [volatility, volume, volumeDelta, supportResistance] = await Promise.all([
      analysisService.analyzeVolatility(symbol),
      analysisService.analyzeVolume(symbol),
      analysisService.analyzeVolumeDelta(symbol),
      analysisService.identifySupportResistance(symbol)
    ]);

    // Create timestamp-based filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `analysis/${symbol}/${timestamp}.json`;

    // Get current price from volatility analysis
    const currentPrice = volatility.currentPrice;

    // Build complete analysis result
    const analysisResult: AnalysisResult = {
      timestamp: Date.now(),
      symbol,
      category,
      price: currentPrice,
      analysis: {
        volatility,
        volume,
        volumeDelta,
        supportResistance
      },
      metadata: {
        version: '1.0.0',
        source: 'bybit-mcp'
      }
    };

    // Save the complete analysis
    await storageService.save(filename, analysisResult);

    console.log(`Analysis saved to: ${filename}`);

    // Also save a simplified summary for quick access
    const summaryFile = `analysis/${symbol}/latest-summary.json`;
    await storageService.save(summaryFile, {
      timestamp: Date.now(),
      symbol,
      price: currentPrice,
      criticalLevel: supportResistance.criticalLevel,
      trend: volume.trend,
      volumeDelta: {
        bias: volumeDelta.bias,
        strength: volumeDelta.strength,
        divergence: volumeDelta.divergence.signal
      }
    });

  } catch (error) {
    console.error('Failed to save analysis:', error);
  }
}

/**
 * Example: Load historical analysis
 */
export async function loadHistoricalAnalysis(
  symbol: string,
  days: number = 7
): Promise<AnalysisResult[]> {
  try {
    // Query all analysis files for the symbol
    const files = await storageService.query(`analysis/${symbol}/*.json`);
    
    // Filter by date
    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentFiles: AnalysisResult[] = [];

    for (const file of files) {
      // Skip summary files
      if (file.includes('summary')) continue;

      const data = await storageService.load<AnalysisResult>(file);
      if (data && data.timestamp && data.timestamp > cutoffDate) {
        recentFiles.push(data);
      }
    }

    // Sort by timestamp (newest first)
    return recentFiles.sort((a, b) => b.timestamp - a.timestamp);

  } catch (error) {
    console.error('Failed to load historical analysis:', error);
    return [];
  }
}

/**
 * Example: Find similar price levels in history
 */
export async function findSimilarPriceLevels(
  symbol: string,
  currentPrice: number,
  tolerance: number = 0.01 // 1%
): Promise<AnalysisResult[]> {
  try {
    const history = await loadHistoricalAnalysis(symbol, 30);
    
    return history.filter(record => {
      const priceDiff = Math.abs(record.price - currentPrice) / currentPrice;
      return priceDiff <= tolerance;
    });

  } catch (error) {
    console.error('Failed to find similar price levels:', error);
    return [];
  }
}

/**
 * Example: Generate daily report
 */
export async function generateDailyReport(): Promise<string> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const reportPath = `reports/daily/${today}.md`;

    // Check if report already exists
    if (await storageService.exists(reportPath)) {
      const existing = await storageService.load<string>(reportPath);
      return existing || '';
    }

    // Get all analysis from today
    const todayAnalysis = await storageService.query(`analysis/*/${today}*.json`);
    
    let report = `# Daily Analysis Report - ${today}\n\n`;
    report += `## Summary\n`;
    report += `- Total analyses performed: ${todayAnalysis.length}\n\n`;

    // Group by symbol
    const bySymbol: Record<string, AnalysisResult[]> = {};
    for (const file of todayAnalysis) {
      const data = await storageService.load<AnalysisResult>(file);
      if (data && data.symbol) {
        if (!bySymbol[data.symbol]) {
          bySymbol[data.symbol] = [];
        }
        bySymbol[data.symbol].push(data);
      }
    }

    // Generate report for each symbol
    for (const [symbol, analyses] of Object.entries(bySymbol)) {
      report += `## ${symbol}\n`;
      report += `- Analyses count: ${analyses.length}\n`;
      
      const latest = analyses[0];
      if (latest?.analysis) {
        report += `- Latest price: ${latest.price}\n`;
        report += `- Critical level: ${latest.analysis.supportResistance?.criticalLevel?.level || 'N/A'}\n`;
        report += `- Volume trend: ${latest.analysis.volume?.trend || 'N/A'}\n\n`;
      }
    }

    // Save report
    await storageService.save(reportPath, report);
    
    return report;

  } catch (error) {
    console.error('Failed to generate daily report:', error);
    return '';
  }
}

/**
 * Example: Storage maintenance
 */
export async function performStorageMaintenance(): Promise<void> {
  try {
    // Get storage stats
    const stats = await storageService.getStorageStats();
    console.log('Storage Statistics:', stats);

    // Clean up old market data (keep only 7 days)
    const marketDataFiles = await storageService.query('market-data/*/*.json');
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    for (const file of marketDataFiles) {
      const metadata = await storageService.getMetadata(file);
      if (metadata && metadata.modified.getTime() < cutoff) {
        await storageService.delete(file);
        console.log(`Deleted old market data: ${file}`);
      }
    }

    // Run general vacuum (30 days for other categories)
    const deleted = await storageService.vacuum(30);
    console.log(`Vacuum deleted ${deleted} old files`);

  } catch (error) {
    console.error('Storage maintenance failed:', error);
  }
}
