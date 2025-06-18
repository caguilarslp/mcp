import { MongoClient } from 'mongodb';

async function testMongoDB() {
  console.log('🔍 Testing MongoDB connection for wAIckoff MCP v1.9.0...\n');
  
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DATABASE || 'waickoff_mcp';
  
  console.log(`URI: ${uri}`);
  console.log(`Database: ${dbName}\n`);
  
  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connected to MongoDB!');
    
    // Test database
    const db = client.db(dbName);
    await db.admin().ping();
    console.log('✅ Database ping successful!');
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('\n📋 Collections:', collections.map(c => c.name).join(', ') || 'none yet');
    
    // Test write
    const testCol = db.collection('test');
    const doc = await testCol.insertOne({ test: true, timestamp: new Date() });
    console.log('✅ Test write successful:', doc.insertedId);
    
    // Clean up
    await testCol.deleteOne({ _id: doc.insertedId });
    console.log('🧹 Test data cleaned up');
    
    await client.close();
    console.log('\n✅ MongoDB is ready for wAIckoff MCP!');
    
  } catch (error) {
    console.error('\n❌ MongoDB connection failed:', error);
    console.log('\n💡 Make sure MongoDB is running on localhost:27017');
    console.log('   Or update MONGODB_URI in .env file');
  }
}

// Load env variables
import { readFileSync } from 'fs';
import { join } from 'path';

try {
  const envPath = join(process.cwd(), '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !key.startsWith('#')) {
      process.env[key.trim()] = value.trim();
    }
  });
} catch (e) {
  console.log('No .env file found, using defaults');
}

testMongoDB();
