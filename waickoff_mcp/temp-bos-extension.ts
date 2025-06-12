/**
 * @fileoverview Smart Money Concepts BOS Formatting Methods - Part 2
 * @description Continuation of BOS handlers - formatting and summary methods
 * @version 1.0.0
 * @author wAIckoff Team
 */

// Esta extensión se incluirá en el handler principal

// ====================
// BOS FORMATTING METHODS
// ====================

private formatMarketStructureAnalysis(analysis: MarketStructureAnalysis): any {
  return {
    symbol: analysis.symbol,
    timeframe: analysis.timeframe,
    currentPrice: Number(analysis.currentPrice.toFixed(6)),
    trend: {
      shortTerm: analysis.trend.shortTerm,
      mediumTerm: analysis.trend.mediumTerm,
      longTerm: analysis.trend.longTerm,
      confidence: analysis.trend.confidence
    },
    structurePoints: analysis.structurePoints.slice(-20).map(point => this.formatStructurePoint(point)),
    activeBreaks: analysis.activeBreaks.map(breakStruct => this.formatStructuralBreak(breakStruct)),
    recentBreaks: analysis.recentBreaks.map(breakStruct => this.formatStructuralBreak(breakStruct)),
    currentStructure: {
      type: analysis.currentStructure.type,
      strength: analysis.currentStructure.strength,
      duration: analysis.currentStructure.duration,
      keyLevels: analysis.currentStructure.keyLevels.map(level => Number(level.toFixed(6)))
    },
    marketBias: {
      direction: analysis.marketBias.direction,
      strength: analysis.marketBias.strength,
      confidence: analysis.marketBias.confidence,
      reasoning: analysis.marketBias.reasoning
    },
    nextDecisionPoints: analysis.nexteDecisionPoints.slice(0, 5).map(point => ({
      level: Number(point.level.toFixed(6)),
      type: point.type,
      significance: point.significance,
      probability: point.probability
    })),
    tradingOpportunities: analysis.tradingOpportunities.slice(0, 3).map(opp => ({
      type: opp.type,
      direction: opp.direction,
      entryZone: {
        min: Number(opp.entryZone.min.toFixed(6)),
        max: Number(opp.entryZone.max.toFixed(6))
      },
      targets: opp.targets.map(t => Number(t.toFixed(6))),
      stopLoss: Number(opp.stopLoss.toFixed(6)),
      riskReward: Number(opp.riskReward.toFixed(2)),
      confidence: opp.confidence,
      reasoning: opp.reasoning
    })),
    timestamp: analysis.timestamp.toISOString()
  };
}

private formatStructurePoint(point: MarketStructurePoint): any {
  return {
    timestamp: point.timestamp.toISOString(),
    price: Number(point.price.toFixed(6)),
    type: point.type,
    strength: point.strength,
    volume: point.volume,
    confirmed: point.confirmed,
    index: point.index
  };
}

private formatStructuralBreak(structuralBreak: any): any {
  return {
    id: structuralBreak.id,
    type: structuralBreak.type,
    direction: structuralBreak.direction,
    breakPoint: {
      timestamp: structuralBreak.breakPoint.timestamp.toISOString(),
      price: Number(structuralBreak.breakPoint.price.toFixed(6)),
      volume: structuralBreak.breakPoint.volume,
      index: structuralBreak.breakPoint.index
    },
    previousStructure: {
      pattern: structuralBreak.previousStructure.pattern,
      duration: structuralBreak.previousStructure.duration,
      strength: structuralBreak.previousStructure.strength
    },
    significance: structuralBreak.significance,
    confirmation: {
      volumeConfirmed: structuralBreak.confirmation.volumeConfirmed,
      followThrough: structuralBreak.confirmation.followThrough,
      retestLevel: structuralBreak.confirmation.retestLevel ? 
        Number(structuralBreak.confirmation.retestLevel.toFixed(6)) : null,
      retestTime: structuralBreak.confirmation.retestTime?.toISOString() || null
    },
    institutionalFootprint: structuralBreak.institutionalFootprint,
    targets: {
      conservative: Number(structuralBreak.targets.conservative.toFixed(6)),
      normal: Number(structuralBreak.targets.normal.toFixed(6)),
      aggressive: Number(structuralBreak.targets.aggressive.toFixed(6))
    },
    invalidationLevel: Number(structuralBreak.invalidationLevel.toFixed(6)),
    probability: structuralBreak.probability,
    createdAt: structuralBreak.createdAt.toISOString(),
    resolvedAt: structuralBreak.resolvedAt?.toISOString() || null,
    outcome: structuralBreak.outcome || null
  };
}

private formatStructureShiftValidation(validation: StructureShiftValidation): any {
  return {
    isValid: validation.isValid,
    confidence: validation.confidence,
    factors: {
      volumeConfirmation: validation.factors.volumeConfirmation,
      priceAction: validation.factors.priceAction,
      institutionalSignals: validation.factors.institutionalSignals,
      timeConfirmation: validation.factors.timeConfirmation,
      structuralIntegrity: validation.factors.structuralIntegrity
    },
    warnings: validation.warnings,
    nextValidationTime: validation.nextValidationTime?.toISOString() || null,
    invalidationScenarios: validation.invalidationScenarios.map(scenario => ({
      trigger: scenario.trigger,
      price: Number(scenario.price.toFixed(6)),
      probability: scenario.probability
    }))
  };
}

// ====================
// BOS SUMMARY METHODS
// ====================

private generateBOSSummary(analysis: MarketStructureAnalysis): string {
  const { symbol, activeBreaks, marketBias, currentStructure, tradingOpportunities } = analysis;
  
  let summary = `📊 **Break of Structure Analysis for ${symbol}**\n\n`;
  
  summary += `**Current Structure:** ${currentStructure.type.toUpperCase()}\n`;
  summary += `• Strength: ${currentStructure.strength}/100\n`;
  summary += `• Duration: ${currentStructure.duration} periods\n\n`;
  
  summary += `**Market Bias:** ${marketBias.direction.toUpperCase()}\n`;
  summary += `• Strength: ${marketBias.strength}/100\n`;
  summary += `• Confidence: ${marketBias.confidence}%\n\n`;
  
  if (activeBreaks.length > 0) {
    summary += `**Active Structural Breaks:** ${activeBreaks.length}\n`;
    const bosCount = activeBreaks.filter(b => b.type === 'BOS').length;
    const chochCount = activeBreaks.filter(b => b.type === 'CHoCH').length;
    summary += `• BOS: ${bosCount} | CHoCH: ${chochCount}\n`;
    
    const latestBreak = activeBreaks[activeBreaks.length - 1];
    if (latestBreak) {
      summary += `• Latest: ${latestBreak.type} ${latestBreak.direction.toUpperCase()} (${latestBreak.probability}% success probability)\n\n`;
    }
  } else {
    summary += `**Active Structural Breaks:** None\n\n`;
  }
  
  if (tradingOpportunities.length > 0) {
    summary += `**Trading Opportunities:** ${tradingOpportunities.length}\n`;
    const bestOpp = tradingOpportunities[0];
    summary += `• Best: ${bestOpp.type.toUpperCase()} ${bestOpp.direction.toUpperCase()}\n`;
    summary += `• Confidence: ${bestOpp.confidence}%\n`;
    summary += `• Risk/Reward: 1:${bestOpp.riskReward}\n`;
    summary += `• Reasoning: ${bestOpp.reasoning}\n\n`;
  } else {
    summary += `**Trading Opportunities:** No immediate signals\n\n`;
  }
  
  // Trend analysis
  const trends = [analysis.trend.shortTerm, analysis.trend.mediumTerm, analysis.trend.longTerm];
  const bullishTrends = trends.filter(t => t === 'bullish').length;
  const bearishTrends = trends.filter(t => t === 'bearish').length;
  
  summary += `**Multi-Timeframe Trend:**\n`;
  summary += `• Short: ${analysis.trend.shortTerm.toUpperCase()}\n`;
  summary += `• Medium: ${analysis.trend.mediumTerm.toUpperCase()}\n`;
  summary += `• Long: ${analysis.trend.longTerm.toUpperCase()}\n`;
  
  if (bullishTrends > bearishTrends) {
    summary += `• **Overall Bias:** BULLISH (${bullishTrends}/3 timeframes)\n`;
  } else if (bearishTrends > bullishTrends) {
    summary += `• **Overall Bias:** BEARISH (${bearishTrends}/3 timeframes)\n`;
  } else {
    summary += `• **Overall Bias:** MIXED (choppy conditions)\n`;
  }
  
  return summary;
}

private generateMarketStructureSummary(analysis: MarketStructureAnalysis): string {
  const { symbol, currentStructure, structurePoints, marketBias } = analysis;
  
  let summary = `🏗️ **Market Structure Analysis for ${symbol}**\n\n`;
  
  summary += `**Current Market Structure:**\n`;
  summary += `• Type: ${currentStructure.type.replace('_', ' ').toUpperCase()}\n`;
  summary += `• Strength: ${currentStructure.strength}/100\n`;
  summary += `• Duration: ${currentStructure.duration} periods\n\n`;
  
  // Structure points analysis
  const recentPoints = structurePoints.slice(-10);
  const higherHighs = recentPoints.filter(p => p.type === 'higher_high').length;
  const lowerLows = recentPoints.filter(p => p.type === 'lower_low').length;
  const higherLows = recentPoints.filter(p => p.type === 'higher_low').length;
  const lowerHighs = recentPoints.filter(p => p.type === 'lower_high').length;
  
  summary += `**Recent Structure Points (Last 10):**\n`;
  summary += `• Higher Highs: ${higherHighs}\n`;
  summary += `• Higher Lows: ${higherLows}\n`;
  summary += `• Lower Highs: ${lowerHighs}\n`;
  summary += `• Lower Lows: ${lowerLows}\n\n`;
  
  // Structural bias
  if (higherHighs > 0 && higherLows > 0 && lowerLows === 0) {
    summary += `**Structural Pattern:** BULLISH TREND (HH + HL pattern)\n`;
  } else if (lowerLows > 0 && lowerHighs > 0 && higherHighs === 0) {
    summary += `**Structural Pattern:** BEARISH TREND (LL + LH pattern)\n`;
  } else if (higherHighs > 0 && lowerLows > 0) {
    summary += `**Structural Pattern:** RANGE/CONSOLIDATION (Mixed HH/LL)\n`;
  } else {
    summary += `**Structural Pattern:** DEVELOPING (Insufficient data)\n`;
  }
  
  summary += `**Market Bias:** ${marketBias.direction.toUpperCase()} (${marketBias.strength}/100 strength)\n`;
  
  return summary;
}

private generateMarketStructureInsights(analysis: MarketStructureAnalysis): string[] {
  const insights: string[] = [];
  const { currentStructure, marketBias, activeBreaks, trend } = analysis;
  
  // Structure strength insights
  if (currentStructure.strength > 80) {
    insights.push('💪 Very strong market structure - High confidence in directional moves');
  } else if (currentStructure.strength < 40) {
    insights.push('⚠️ Weak market structure - Expect choppy price action');
  }
  
  // Bias alignment insights
  const trendsAligned = [trend.shortTerm, trend.mediumTerm, trend.longTerm]
    .filter(t => t === marketBias.direction).length;
  
  if (trendsAligned === 3) {
    insights.push('🎯 Perfect trend alignment across all timeframes - Strong directional bias');
  } else if (trendsAligned === 0) {
    insights.push('🌪️ No trend alignment - Conflicting signals across timeframes');
  }
  
  // Break insights
  if (activeBreaks.length > 3) {
    insights.push('📈 Multiple active breaks detected - High volatility expected');
  }
  
  const recentChoCH = activeBreaks.filter(b => b.type === 'CHoCH' && 
    Date.now() - b.createdAt.getTime() < 24 * 60 * 60 * 1000).length;
  
  if (recentChoCH > 0) {
    insights.push('🔄 Recent Change of Character detected - Potential trend shift in progress');
  }
  
  // Structure duration insights
  if (currentStructure.duration > 50) {
    insights.push('⏰ Long-lasting structure - Mature phase, watch for exhaustion');
  } else if (currentStructure.duration < 10) {
    insights.push('🌱 New structure forming - Early development phase');
  }
  
  // Bias confidence insights
  if (marketBias.confidence > 85) {
    insights.push('✅ High confidence market bias - Clear directional opportunity');
  } else if (marketBias.confidence < 50) {
    insights.push('❓ Low confidence bias - Wait for clearer signals');
  }
  
  if (insights.length === 0) {
    insights.push('📊 Market structure analysis complete - Monitor for new developments');
  }
  
  return insights;
}

private generateValidationSummary(validation: StructureShiftValidation): string {
  let summary = `🔍 **Structure Shift Validation**\n\n`;
  
  summary += `**Overall Validity:** ${validation.isValid ? '✅ VALID' : '❌ INVALID'}\n`;
  summary += `**Confidence:** ${validation.confidence.toFixed(1)}%\n\n`;
  
  summary += `**Validation Factors:**\n`;
  summary += `• Volume Confirmation: ${validation.factors.volumeConfirmation.toFixed(1)}%\n`;
  summary += `• Price Action: ${validation.factors.priceAction.toFixed(1)}%\n`;
  summary += `• Institutional Signals: ${validation.factors.institutionalSignals.toFixed(1)}%\n`;
  summary += `• Time Confirmation: ${validation.factors.timeConfirmation.toFixed(1)}%\n`;
  summary += `• Structural Integrity: ${validation.factors.structuralIntegrity.toFixed(1)}%\n\n`;
  
  if (validation.warnings.length > 0) {
    summary += `**Warnings:**\n`;
    validation.warnings.forEach(warning => {
      summary += `⚠️ ${warning}\n`;
    });
    summary += '\n';
  }
  
  if (validation.invalidationScenarios.length > 0) {
    summary += `**Invalidation Scenarios:**\n`;
    validation.invalidationScenarios.forEach(scenario => {
      summary += `• ${scenario.trigger}: $${scenario.price.toFixed(4)} (${scenario.probability}% probability)\n`;
    });
  }
  
  return summary;
}

private generateStructureValidationRecommendations(validation: StructureShiftValidation): string[] {
  const recommendations: string[] = [];
  
  if (validation.isValid) {
    if (validation.confidence > 80) {
      recommendations.push('🎯 High confidence validation - Structure shift confirmed');
      recommendations.push('📈 Consider position sizing based on strong validation');
    } else if (validation.confidence > 60) {
      recommendations.push('✅ Moderate confidence validation - Structure shift likely');
      recommendations.push('⚖️ Use conservative position sizing');
    } else {
      recommendations.push('⚠️ Low confidence validation - Wait for stronger confirmation');
    }
  } else {
    recommendations.push('❌ Structure shift not validated - Avoid new positions');
    recommendations.push('🔍 Monitor for re-validation or alternative setups');
  }
  
  // Factor-specific recommendations
  if (validation.factors.volumeConfirmation < 60) {
    recommendations.push('📊 Volume confirmation weak - Wait for volume surge');
  }
  
  if (validation.factors.institutionalSignals > 80) {
    recommendations.push('🏦 Strong institutional signals detected - High probability move');
  }
  
  if (validation.factors.timeConfirmation < 50) {
    recommendations.push('⏰ Time confirmation pending - Allow more development time');
  }
  
  if (validation.warnings.length > 2) {
    recommendations.push('⚠️ Multiple warnings present - Exercise extra caution');
  }
  
  if (validation.invalidationScenarios.some(s => s.probability > 30)) {
    recommendations.push('🛡️ High invalidation risk - Use tight stop losses');
  }
  
  return recommendations;
}
