/**
 * Test MongoDB Connection
 * Quick test to verify MongoDB connectivity
 */

import { MongoClient } from 'mongodb';
// Manual env loading since we're using ES modules
import { readFileSync } from 'fs';
import { join } from 'path';

// Load .env file manually
try {
  const envPath = join(process.cwd(), '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
} catch (error) {
  console.warn('⚠️ .env file not found, using defaults');
}



async function testMongoConnection() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DATABASE || 'waickoff_mcp';
  
  console.log('🔍 Testing MongoDB connection...');
  console.log(`URI: ${uri}`);
  console.log(`Database: ${dbName}`);
  
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000
  });
  
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB!');
    
    // Ping the database
    await client.db(dbName).admin().ping();
    console.log('✅ Database ping successful!');
    
    // List collections
    const collections = await client.db(dbName).listCollections().toArray();
    console.log(`📋 Collections in ${dbName}:`, collections.map(c => c.name));
    
    // Test write operation
    const testCollection = client.db(dbName).collection('test_connection');
    const result = await testCollection.insertOne({
      test: true,
      timestamp: new Date(),
      message: 'wAIckoff MCP MongoDB connection test'
    });
    console.log('✅ Test write successful:', result.insertedId);
    
    // Clean up test data
    await testCollection.deleteOne({ _id: result.insertedId });
    console.log('🧹 Test data cleaned up');
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    return false;
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

// Run the test
testMongoConnection()
  .then(success => {
    console.log('\n' + '='.repeat(50));
    console.log(success ? '✅ MongoDB is ready for wAIckoff MCP!' : '❌ MongoDB connection failed');
    console.log('='.repeat(50));
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
