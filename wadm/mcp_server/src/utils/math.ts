/**
 * @fileoverview Math Utilities
 * @description Mathematical functions for technical analysis
 * @version 1.3.0
 */

export class MathUtils {
  
  /**
   * Calculate the mean (average) of an array of numbers
   */
  mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate the median of an array of numbers
   */
  median(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    } else {
      return sorted[middle];
    }
  }

  /**
   * Calculate the standard deviation of an array of numbers
   */
  standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = this.mean(values);
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
    const variance = this.mean(squaredDifferences);
    
    return Math.sqrt(variance);
  }

  /**
   * Calculate the variance of an array of numbers
   */
  variance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = this.mean(values);
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
    
    return this.mean(squaredDifferences);
  }

  /**
   * Calculate Simple Moving Average (SMA)
   */
  sma(values: number[], period: number): number[] {
    if (values.length < period) return [];
    
    const smaValues: number[] = [];
    
    for (let i = period - 1; i < values.length; i++) {
      const slice = values.slice(i - period + 1, i + 1);
      smaValues.push(this.mean(slice));
    }
    
    return smaValues;
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   */
  ema(values: number[], period: number): number[] {
    if (values.length === 0) return [];
    
    const multiplier = 2 / (period + 1);
    const emaValues: number[] = [values[0]]; // First EMA value is the first price
    
    for (let i = 1; i < values.length; i++) {
      const ema = (values[i] * multiplier) + (emaValues[i - 1] * (1 - multiplier));
      emaValues.push(ema);
    }
    
    return emaValues;
  }

  /**
   * Calculate Bollinger Bands
   */
  bollingerBands(values: number[], period: number, standardDeviations: number = 2): {
    upper: number[];
    middle: number[];
    lower: number[];
  } {
    const smaValues = this.sma(values, period);
    const upper: number[] = [];
    const lower: number[] = [];
    
    for (let i = 0; i < smaValues.length; i++) {
      const dataIndex = i + period - 1;
      const slice = values.slice(dataIndex - period + 1, dataIndex + 1);
      const stdDev = this.standardDeviation(slice);
      
      upper.push(smaValues[i] + (stdDev * standardDeviations));
      lower.push(smaValues[i] - (stdDev * standardDeviations));
    }
    
    return {
      upper,
      middle: smaValues,
      lower
    };
  }

  /**
   * Calculate Relative Strength Index (RSI)
   */
  rsi(values: number[], period: number = 14): number[] {
    if (values.length < period + 1) return [];
    
    const gains: number[] = [];
    const losses: number[] = [];
    
    // Calculate price changes
    for (let i = 1; i < values.length; i++) {
      const change = values[i] - values[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const rsiValues: number[] = [];
    
    // Calculate initial averages
    let avgGain = this.mean(gains.slice(0, period));
    let avgLoss = this.mean(losses.slice(0, period));
    
    // Calculate first RSI
    let rs = avgGain / avgLoss;
    rsiValues.push(100 - (100 / (1 + rs)));
    
    // Calculate subsequent RSI values using Wilder's smoothing
    for (let i = period; i < gains.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
      
      rs = avgGain / avgLoss;
      rsiValues.push(100 - (100 / (1 + rs)));
    }
    
    return rsiValues;
  }

  /**
   * Calculate percentage change between two values
   */
  percentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Calculate the correlation coefficient between two arrays
   */
  correlation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const meanX = this.mean(x);
    const meanY = this.mean(y);
    
    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;
    
    for (let i = 0; i < x.length; i++) {
      const xDiff = x[i] - meanX;
      const yDiff = y[i] - meanY;
      
      numerator += xDiff * yDiff;
      sumXSquared += xDiff * xDiff;
      sumYSquared += yDiff * yDiff;
    }
    
    const denominator = Math.sqrt(sumXSquared * sumYSquared);
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Find local maxima in an array
   */
  findLocalMaxima(values: number[], window: number = 3): number[] {
    const maxima: number[] = [];
    
    for (let i = window; i < values.length - window; i++) {
      let isMaximum = true;
      
      for (let j = i - window; j <= i + window; j++) {
        if (j !== i && values[j] >= values[i]) {
          isMaximum = false;
          break;
        }
      }
      
      if (isMaximum) {
        maxima.push(i);
      }
    }
    
    return maxima;
  }

  /**
   * Find local minima in an array
   */
  findLocalMinima(values: number[], window: number = 3): number[] {
    const minima: number[] = [];
    
    for (let i = window; i < values.length - window; i++) {
      let isMinimum = true;
      
      for (let j = i - window; j <= i + window; j++) {
        if (j !== i && values[j] <= values[i]) {
          isMinimum = false;
          break;
        }
      }
      
      if (isMinimum) {
        minima.push(i);
      }
    }
    
    return minima;
  }

  /**
   * Calculate VWAP (Volume Weighted Average Price)
   */
  vwap(prices: number[], volumes: number[]): number {
    if (prices.length !== volumes.length || prices.length === 0) return 0;
    
    let totalVolume = 0;
    let totalPriceVolume = 0;
    
    for (let i = 0; i < prices.length; i++) {
      totalVolume += volumes[i];
      totalPriceVolume += prices[i] * volumes[i];
    }
    
    return totalVolume === 0 ? 0 : totalPriceVolume / totalVolume;
  }

  /**
   * Normalize values to a range [0, 1]
   */
  normalize(values: number[]): number[] {
    if (values.length === 0) return [];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    if (range === 0) return values.map(() => 0);
    
    return values.map(val => (val - min) / range);
  }

  /**
   * Calculate linear regression
   */
  linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
    if (x.length !== y.length || x.length === 0) {
      return { slope: 0, intercept: 0, r2: 0 };
    }
    
    const n = x.length;
    const meanX = this.mean(x);
    const meanY = this.mean(y);
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (x[i] - meanX) * (y[i] - meanY);
      denominator += (x[i] - meanX) ** 2;
    }
    
    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = meanY - slope * meanX;
    
    // Calculate R-squared
    let ssRes = 0;
    let ssTot = 0;
    
    for (let i = 0; i < n; i++) {
      const predicted = slope * x[i] + intercept;
      ssRes += (y[i] - predicted) ** 2;
      ssTot += (y[i] - meanY) ** 2;
    }
    
    const r2 = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);
    
    return { slope, intercept, r2 };
  }

  /**
   * Round to specified decimal places
   */
  round(value: number, decimals: number = 4): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Clamp value between min and max
   */
  clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Check if a number is in a specific range (inclusive)
   */
  inRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }

  /**
   * Calculate the sum of an array
   */
  sum(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0);
  }

  /**
   * Calculate the maximum value in an array
   */
  max(values: number[]): number {
    return Math.max(...values);
  }

  /**
   * Calculate the minimum value in an array
   */
  min(values: number[]): number {
    return Math.min(...values);
  }
}