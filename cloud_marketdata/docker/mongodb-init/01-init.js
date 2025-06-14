// MongoDB 7.x Initialization Script
// Creates indexes and basic setup for Cloud MarketData

// Switch to our database
db = db.getSiblingDB('cloud_marketdata');

// Create application user
db.createUser({
  user: 'marketdata_user',
  pwd: 'marketdata123',
  roles: [
    {
      role: 'readWrite',
      db: 'cloud_marketdata'
    }
  ]
});

print('✅ Created marketdata_user');

// Create collections with schema validation (MongoDB 7.x feature)

// Trades collection
db.createCollection('trades', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['symbol', 'price', 'quantity', 'timestamp', 'exchange', 'side'],
      properties: {
        symbol: { bsonType: 'string', description: 'Trading pair symbol' },
        price: { bsonType: 'double', minimum: 0, description: 'Trade price' },
        quantity: { bsonType: 'double', minimum: 0, description: 'Trade quantity' },
        timestamp: { bsonType: 'date', description: 'Trade timestamp' },
        exchange: { enum: ['bybit', 'binance'], description: 'Exchange name' },
        side: { enum: ['buy', 'sell'], description: 'Trade side' },
        trade_id: { bsonType: 'string', description: 'Exchange trade ID' }
      }
    }
  }
});

// OrderBook collection
db.createCollection('orderbook', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['symbol', 'timestamp', 'exchange', 'bids', 'asks'],
      properties: {
        symbol: { bsonType: 'string' },
        timestamp: { bsonType: 'date' },
        exchange: { enum: ['bybit', 'binance'] },
        bids: { bsonType: 'array' },
        asks: { bsonType: 'array' }
      }
    }
  }
});

print('✅ Created collections with validation');

// Create indexes optimized for MongoDB 7.x
// Trades indexes
db.trades.createIndex({ symbol: 1, timestamp: -1 });
db.trades.createIndex({ exchange: 1, symbol: 1, timestamp: -1 });
db.trades.createIndex({ timestamp: 1 }, { expireAfterSeconds: 3600 }); // TTL 1 hour

// OrderBook indexes  
db.orderbook.createIndex({ symbol: 1, timestamp: -1 });
db.orderbook.createIndex({ exchange: 1, symbol: 1, timestamp: -1 });
db.orderbook.createIndex({ timestamp: 1 }, { expireAfterSeconds: 1800 }); // TTL 30 minutes

print('✅ Created optimized indexes with TTL');

// Create system info collection
db.createCollection('system_info');
db.system_info.insertOne({
  initialized_at: new Date(),
  version: '0.1.0',
  mongodb_version: '7.0',
  features: ['schema_validation', 'ttl_indexes', 'auth_enabled']
});

print('✅ Cloud MarketData MongoDB 7.x initialization complete!');
