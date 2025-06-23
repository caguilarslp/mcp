/**
 * @fileoverview Test utilities and mock helpers
 * @description Common utilities for testing
 */

import { MarketAnalysisEngine } from '../src/core/engine';

// Type for mocked MarketAnalysisEngine with all methods
export type MockedMarketAnalysisEngine = jest.Mocked<MarketAnalysisEngine> & {
  getTicker: jest.Mock;
  getOrderbook: jest.Mock;
  getKlines: jest.Mock;
  getMarketData: jest.Mock;
  performTechnicalAnalysis: jest.Mock;
  getGridTradingSuggestions: jest.Mock;
  getCompleteAnalysis: jest.Mock;
  getSystemHealth: jest.Mock;
  getCacheStats: jest.Mock;
  clearCache: jest.Mock;
  invalidateCache: jest.Mock;
  getAnalysisById: jest.Mock;
  getLatestAnalysis: jest.Mock;
  searchAnalyses: jest.Mock;
  getAnalysisSummary: jest.Mock;
  getAggregatedMetrics: jest.Mock;
  findPatterns: jest.Mock;
  getRepositoryStats: jest.Mock;
  generateReport: jest.Mock;
  generateDailyReport: jest.Mock;
  generateWeeklyReport: jest.Mock;
  generateSymbolReport: jest.Mock;
  generatePerformanceReport: jest.Mock;
  getReport: jest.Mock;
  listReports: jest.Mock;
  exportReport: jest.Mock;
  getPerformanceMetrics: jest.Mock;
};

// Create a fully mocked MarketAnalysisEngine
export function createMockEngine(): MockedMarketAnalysisEngine {
  const mockEngine = {
    getTicker: jest.fn(),
    getOrderbook: jest.fn(),
    getKlines: jest.fn(),
    getMarketData: jest.fn(),
    performTechnicalAnalysis: jest.fn(),
    getGridTradingSuggestions: jest.fn(),
    getCompleteAnalysis: jest.fn(),
    getSystemHealth: jest.fn(),
    getCacheStats: jest.fn(),
    clearCache: jest.fn(),
    invalidateCache: jest.fn(),
    getAnalysisById: jest.fn(),
    getLatestAnalysis: jest.fn(),
    searchAnalyses: jest.fn(),
    getAnalysisSummary: jest.fn(),
    getAggregatedMetrics: jest.fn(),
    findPatterns: jest.fn(),
    getRepositoryStats: jest.fn(),
    generateReport: jest.fn(),
    generateDailyReport: jest.fn(),
    generateWeeklyReport: jest.fn(),
    generateSymbolReport: jest.fn(),
    generatePerformanceReport: jest.fn(),
    getReport: jest.fn(),
    listReports: jest.fn(),
    exportReport: jest.fn(),
    getPerformanceMetrics: jest.fn()
  } as MockedMarketAnalysisEngine;

  return mockEngine;
}
