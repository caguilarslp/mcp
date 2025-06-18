// MongoDB initialization script
db = db.getSiblingDB('wadm');

// Create collections with time-series optimization
db.createCollection('trades', {
    timeseries: {
        timeField: 'timestamp',
        metaField: 'metadata',
        granularity: 'seconds'
    },
    expireAfterSeconds: 3600 // 1 hour retention for raw trades
});

db.createCollection('orderbook_snapshots', {
    timeseries: {
        timeField: 'timestamp',
        metaField: 'metadata',
        granularity: 'minutes'
    },
    expireAfterSeconds: 86400 // 24 hour retention
});

db.createCollection('klines_1m', {
    timeseries: {
        timeField: 'timestamp',
        metaField: 'metadata',
        granularity: 'minutes'
    },
    expireAfterSeconds: 86400 // 24 hour retention for 1m klines
});

db.createCollection('klines_1h', {
    timeseries: {
        timeField: 'timestamp',
        metaField: 'metadata',
        granularity: 'hours'
    },
    expireAfterSeconds: 604800 // 7 day retention for 1h klines
});

// Create regular collections
db.createCollection('volume_profiles');
db.createCollection('order_flow');
db.createCollection('alerts');

// Create indexes
db.trades.createIndex({ 'metadata.symbol': 1, 'timestamp': -1 });
db.trades.createIndex({ 'metadata.exchange': 1, 'timestamp': -1 });

db.orderbook_snapshots.createIndex({ 'metadata.symbol': 1, 'timestamp': -1 });
db.orderbook_snapshots.createIndex({ 'metadata.exchange': 1, 'timestamp': -1 });

db.klines_1m.createIndex({ 'metadata.symbol': 1, 'timestamp': -1 });
db.klines_1h.createIndex({ 'metadata.symbol': 1, 'timestamp': -1 });

db.volume_profiles.createIndex({ 'symbol': 1, 'timeframe': 1, 'timestamp': -1 });
db.volume_profiles.createIndex({ 'timestamp': -1 });

db.order_flow.createIndex({ 'symbol': 1, 'timestamp': -1 });
db.order_flow.createIndex({ 'timestamp': -1 });

db.alerts.createIndex({ 'user_id': 1, 'status': 1 });
db.alerts.createIndex({ 'triggered_at': -1 });

print('MongoDB initialization completed successfully');
