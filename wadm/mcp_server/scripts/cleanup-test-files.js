#!/usr/bin/env node

/**
 * Cleanup script for test analysis files
 */

const fs = require('fs').promises;
const path = require('path');

async function cleanupAnalysisFiles() {
  const basePath = path.join(__dirname, '..', 'storage', 'analysis');
  const symbols = ['ADAUSDT', 'BTCUSDT', 'ETHUSDT', 'HBARUSDT', 'KASUSDT', 'XRPUSDT'];
  
  let totalDeleted = 0;
  
  for (const symbol of symbols) {
    const symbolPath = path.join(basePath, symbol);
    
    try {
      const files = await fs.readdir(symbolPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(symbolPath, file);
          await fs.unlink(filePath);
          console.log(`✅ Deleted: ${symbol}/${file}`);
          totalDeleted++;
        }
      }
      
      // Remove empty directory
      if (files.length > 0) {
        try {
          await fs.rmdir(symbolPath);
          console.log(`📁 Removed empty directory: ${symbol}`);
        } catch (err) {
          // Directory might not be empty or might not exist
        }
      }
      
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`❌ Error processing ${symbol}:`, err.message);
      }
    }
  }
  
  console.log(`\n📊 Total files deleted: ${totalDeleted}`);
}

// Run cleanup
cleanupAnalysisFiles().catch(console.error);
