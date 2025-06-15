// MongoDB initialization script
// Creates initial collections and indexes for optimal performance

db = db.getSiblingDB('cloud_marketdata');

// Create collections with validation
db.createCollection('trades', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['symbol', 'exchange', 'timestamp', 'price', 'volume'],
            properties: {
                symbol: { bsonType: 'string' },
                exchange: { bsonType: 'string' },
                timestamp: { bsonType: 'date' },
                price: { bsonType: 'decimal' },
                volume: { bsonType: 'decimal' }
            }
        }
    }
});

db.createCollection('orderbooks', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['symbol', 'exchange', 'timestamp'],
            properties: {
                symbol: { bsonType: 'string' },
                exchange: { bsonType: 'string' },
                timestamp: { bsonType: 'date' }
            }
        }
    }
});

db.createCollection('volume_profiles');
db.createCollection('order_flows');

// Create indexes for performance
db.trades.createIndex({ symbol: 1, timestamp: -1 });
db.trades.createIndex({ exchange: 1, timestamp: -1 });
db.trades.createIndex({ timestamp: 1 }, { expireAfterSeconds: 3600 }); // 1 hour TTL

db.orderbooks.createIndex({ symbol: 1, timestamp: -1 });
db.orderbooks.createIndex({ exchange: 1, timestamp: -1 });
db.orderbooks.createIndex({ timestamp: 1 }, { expireAfterSeconds: 3600 }); // 1 hour TTL

db.volume_profiles.createIndex({ symbol: 1, timeframe: 1, timestamp: -1 });
db.order_flows.createIndex({ symbol: 1, timeframe: 1, timestamp: -1 });

print('✅ MongoDB initialization completed');
