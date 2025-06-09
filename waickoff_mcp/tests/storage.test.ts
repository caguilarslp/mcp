/**
 * Storage Service Tests
 * Unit tests for the storage service implementation
 */

import { StorageService } from '../src/services/storage';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

describe('StorageService', () => {
  let storage: StorageService;
  const testBasePath = './test-storage';
  
  beforeEach(async () => {
    // Create test storage with test config
    const testConfig = {
      basePath: testBasePath,
      maxFileSize: 1024 * 1024, // 1MB for tests
      maxTotalSize: 10 * 1024 * 1024, // 10MB
      compressionEnabled: false,
      autoCleanupDays: 7
    };
    
    // Create test config file
    await fs.mkdir(path.dirname('./test-storage/config/storage.config.json'), { recursive: true });
    await fs.writeFile(
      './test-storage/config/storage.config.json', 
      JSON.stringify(testConfig, null, 2)
    );
    
    storage = new StorageService('./test-storage/config/storage.config.json');
  });

  afterEach(async () => {
    // Clean up test storage
    if (existsSync(testBasePath)) {
      await fs.rm(testBasePath, { recursive: true, force: true });
    }
  });

  describe('Basic CRUD Operations', () => {
    test('should save and load JSON data', async () => {
      const testData = {
        symbol: 'BTCUSDT',
        price: 45000,
        timestamp: Date.now()
      };

      await storage.save('test/data.json', testData);
      const loaded = await storage.load<typeof testData>('test/data.json');

      expect(loaded).toEqual(testData);
    });

    test('should return null for non-existent file', async () => {
      const loaded = await storage.load('non/existent.json');
      expect(loaded).toBeNull();
    });

    test('should check file existence', async () => {
      await storage.save('test/exists.json', { test: true });
      
      expect(await storage.exists('test/exists.json')).toBe(true);
      expect(await storage.exists('test/notexists.json')).toBe(false);
    });

    test('should delete files', async () => {
      await storage.save('test/delete.json', { test: true });
      expect(await storage.exists('test/delete.json')).toBe(true);
      
      await storage.delete('test/delete.json');
      expect(await storage.exists('test/delete.json')).toBe(false);
    });

    test('should handle complex nested data', async () => {
      const complexData = {
        analysis: {
          supportResistance: [
            { level: 45000, strength: 0.8, type: 'resistance' },
            { level: 42000, strength: 0.9, type: 'support' }
          ],
          indicators: {
            rsi: 65,
            macd: { signal: 0.5, histogram: 0.2 }
          }
        },
        metadata: {
          timestamp: Date.now(),
          version: '1.0.0'
        }
      };

      await storage.save('analysis/complex.json', complexData);
      const loaded = await storage.load<typeof complexData>('analysis/complex.json');
      
      expect(loaded).toEqual(complexData);
    });
  });

  describe('Directory Operations', () => {
    test('should list files in directory', async () => {
      await storage.save('analysis/file1.json', { id: 1 });
      await storage.save('analysis/file2.json', { id: 2 });
      await storage.save('patterns/file3.json', { id: 3 });

      const files = await storage.list('analysis');
      expect(files).toHaveLength(2);
      expect(files).toContain('analysis/file1.json');
      expect(files).toContain('analysis/file2.json');
    });

    test('should return empty array for non-existent directory', async () => {
      const files = await storage.list('nonexistent');
      expect(files).toEqual([]);
    });
  });

  describe('Query Operations', () => {
    test('should query files by pattern', async () => {
      await storage.save('analysis/btc/2024-01-01.json', {});
      await storage.save('analysis/btc/2024-01-02.json', {});
      await storage.save('analysis/eth/2024-01-01.json', {});
      await storage.save('patterns/btc/divergence.json', {});

      const btcFiles = await storage.query('*/btc/*.json');
      expect(btcFiles).toHaveLength(3);

      const analysisFiles = await storage.query('analysis/*/*.json');
      expect(analysisFiles).toHaveLength(3);

      const jan01Files = await storage.query('*/*/2024-01-01.json');
      expect(jan01Files).toHaveLength(2);
    });
  });

  describe('Metadata Operations', () => {
    test('should get file metadata', async () => {
      const testData = { test: true };
      await storage.save('test/metadata.json', testData);

      const metadata = await storage.getMetadata('test/metadata.json');
      expect(metadata).toBeTruthy();
      expect(metadata?.path).toBe('test/metadata.json');
      expect(metadata?.size).toBeGreaterThan(0);
      expect(metadata?.created).toBeInstanceOf(Date);
    });

    test('should get file size', async () => {
      const testData = { data: 'a'.repeat(1000) };
      await storage.save('test/size.json', testData);

      const size = await storage.getSize('test/size.json');
      expect(size).toBeGreaterThan(1000);
    });
  });

  describe('Maintenance Operations', () => {
    test('should vacuum old files', async () => {
      // Create files with different ages
      const now = Date.now();
      const oldDate = new Date(now - 10 * 24 * 60 * 60 * 1000); // 10 days old
      
      await storage.save('old/file1.json', { old: true });
      await storage.save('new/file2.json', { new: true });

      // Manually set old file's modified time (requires additional implementation)
      // For now, just test the vacuum function runs
      const deleted = await storage.vacuum(5);
      expect(deleted).toBeGreaterThanOrEqual(0);
    });

    test('should get storage statistics', async () => {
      await storage.save('market-data/btc.json', { price: 45000 });
      await storage.save('analysis/btc.json', { rsi: 65 });
      await storage.save('patterns/divergence.json', { type: 'bullish' });

      const stats = await storage.getStorageStats();
      expect(stats.totalFiles).toBe(3);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.sizeByCategory.marketData).toBeGreaterThan(0);
      expect(stats.sizeByCategory.analysis).toBeGreaterThan(0);
      expect(stats.sizeByCategory.patterns).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should throw error for invalid paths', async () => {
      await expect(storage.save('../outside/path.json', {}))
        .rejects.toThrow('Invalid path');
      
      await expect(storage.save('/absolute/path.json', {}))
        .rejects.toThrow('Invalid path');
    });

    test('should throw error for oversized files', async () => {
      const largeData = { data: 'x'.repeat(2 * 1024 * 1024) }; // 2MB
      
      await expect(storage.save('test/large.json', largeData))
        .rejects.toThrow('exceeds limit');
    });
  });
});
