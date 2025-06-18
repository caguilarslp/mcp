/**
 * @fileoverview Wyckoff Analysis Types
 * @description Core types for Wyckoff methodology implementation
 * @version 1.0.0
 */

// ====================
// CORE WYCKOFF TYPES
// ====================

export type WyckoffPhase = 
  | 'accumulation_phase_a'    // Selling climax, automatic reaction
  | 'accumulation_phase_b'    // Building cause, testing supply
  | 'accumulation_phase_c'    // Spring, last point of supply
  | 'accumulation_phase_d'    // Signs of strength appearing
  | 'accumulation_phase_e'    // Last point of support before markup
  | 'markup'                  // Trending phase up
  | 'distribution_phase_a'    // Preliminary supply, buying climax
  | 'distribution_phase_b'    // Building cause, testing demand
  | 'distribution_phase_c'    // Upthrust, last point of demand
  | 'distribution_phase_d'    // Signs of weakness appearing
  | 'distribution_phase_e'    // Last point of support before markdown
  | 'markdown'               // Trending phase down
  | 'reaccumulation'         // Secondary accumulation in uptrend
  | 'redistribution'         // Secondary distribution in downtrend
  | 'uncertain';             // No clear phase detected

export interface WyckoffPhaseAnalysis {
  symbol: string;
  timeframe: string;
  analysisDate: Date;
  currentPhase: WyckoffPhase;
  phaseConfidence: number; // 0-100
  phaseProgress: number; // 0-100 completion percentage
  tradingRange?: TradingRange;
  keyEvents: WyckoffEvent[];
  volumeCharacteristics: VolumeContext;
  interpretation: {
    bias: 'accumulation' | 'distribution' | 'trending' | 'uncertain';
    strength: 'weak' | 'moderate' | 'strong';
    implications: string[];
    nextExpectedEvents: string[];
  };
}

// ====================
// TRADING RANGE TYPES
// ====================

export interface TradingRange {
  startDate: Date;
  endDate?: Date;
  support: number;
  resistance: number;
  duration: number; // days
  width: number; // percentage range
  volumeProfile: {
    averageVolume: number;
    volumeTrend: 'increasing' | 'decreasing' | 'stable';
    significantEvents: VolumeEvent[];
  };
  strength: 'weak' | 'moderate' | 'strong';
  type: 'accumulation' | 'distribution' | 'consolidation';
}

export interface TradingRangeAnalysis {
  tradingRange: TradingRange | null;
  rangeQuality: 'excellent' | 'good' | 'poor' | 'invalid';
  confidence: number;
  keyLevels: {
    support: number;
    resistance: number;
    midpoint: number;
  };
  volumeCharacteristics: VolumeContext;
  recommendations: string[];
}

// ====================
// EVENT TYPES
// ====================

export interface WyckoffEvent {
  timestamp: Date;
  type: 'spring' | 'upthrust' | 'test' | 'shakeout' | 'jump_across_creek' | 'sign_of_strength' | 'sign_of_weakness';
  price: number;
  volume: number;
  significance: number; // 0-100
  description: string;
  context: {
    phaseAtTime: WyckoffPhase;
    relativeToRange: 'below_support' | 'at_support' | 'within_range' | 'at_resistance' | 'above_resistance';
    volumeCharacter: 'high' | 'normal' | 'low';
  };
}

export interface SpringEvent extends WyckoffEvent {
  type: 'spring';
  penetrationDepth: number; // how far below support
  recoverySpeed: number; // how quickly it recovered
  volumeOnPenetration: number;
  volumeOnRecovery: number;
  isSuccessful: boolean; // did it lead to markup?
}

export interface UpthrustEvent extends WyckoffEvent {
  type: 'upthrust';
  penetrationHeight: number; // how far above resistance
  rejectionSpeed: number; // how quickly it was rejected
  volumeOnPenetration: number;
  volumeOnRejection: number;
  isSuccessful: boolean; // did it lead to markdown?
}

export interface TestEvent extends WyckoffEvent {
  type: 'test';
  levelTested: number;
  testQuality: 'good' | 'poor' | 'failed';
  volumeOnTest: number;
  resultingAction: 'bounce' | 'break' | 'stall';
}

// ====================
// VOLUME TYPES
// ====================

export interface VolumeContext {
  overallTrend: 'increasing' | 'decreasing' | 'stable';
  climaxEvents: ClimaxEvent[];
  dryUpPeriods: DryUpPeriod[];
  avgVolumeInRange: number;
  currentVolumeRank: number; // percentile of current volume vs range
  interpretation: string;
}

export interface ClimaxEvent {
  date: Date;
  type: 'buying_climax' | 'selling_climax';
  volume: number;
  priceAction: string;
  significance: number;
}

export interface DryUpPeriod {
  startDate: Date;
  endDate: Date;
  averageVolume: number;
  significance: 'minor' | 'moderate' | 'major';
}

export interface VolumeEvent {
  date: Date;
  volume: number;
  type: 'spike' | 'dry_up' | 'climax';
  significance: number;
}

// ====================
// SERVICE INTERFACE
// ====================

export interface IWyckoffBasicService {
  analyzeWyckoffPhase(
    symbol: string, 
    timeframe: string,
    lookback?: number
  ): Promise<WyckoffPhaseAnalysis>;

  detectTradingRange(
    symbol: string,
    timeframe: string,
    minPeriods?: number
  ): Promise<TradingRangeAnalysis>;

  detectSprings(
    symbol: string,
    timeframe: string,
    tradingRange: TradingRange
  ): Promise<SpringEvent[]>;

  detectUpthrusts(
    symbol: string,
    timeframe: string,
    tradingRange: TradingRange
  ): Promise<UpthrustEvent[]>;

  detectTestEvents(
    symbol: string,
    timeframe: string,
    keyLevels: number[]
  ): Promise<TestEvent[]>;

  analyzeWyckoffVolume(
    symbol: string,
    timeframe: string,
    klines: import('../../../types/index.js').OHLCV[]
  ): Promise<VolumeContext>;

  getPerformanceMetrics(): import('../../../types/index.js').PerformanceMetrics[];
}
