// MongoDB Initialization Script for Development
// This script sets up the initial database structure and indexes

print('Starting MongoDB initialization for WADM...');

// Switch to wadm database
db = db.getSiblingDB('wadm');

// Create user for the application
db.createUser({
  user: 'wadm_app',
  pwd: 'wadm_app_pass_2025',
  roles: [
    { role: 'readWrite', db: 'wadm' },
    { role: 'dbAdmin', db: 'wadm' }
  ]
});

// Create collections and indexes
print('Creating collections and indexes...');

// Trades collection with TTL index
db.createCollection('trades');
db.trades.createIndex({ 'timestamp': 1 }, { expireAfterSeconds: 3600 }); // 1 hour TTL
db.trades.createIndex({ 'symbol': 1, 'timestamp': -1 });
db.trades.createIndex({ 'exchange': 1, 'symbol': 1, 'timestamp': -1 });

// Volume Profile collection with TTL
db.createCollection('volume_profiles');
db.volume_profiles.createIndex({ 'timestamp': 1 }, { expireAfterSeconds: 86400 }); // 24 hours TTL
db.volume_profiles.createIndex({ 'symbol': 1, 'timestamp': -1 });
db.volume_profiles.createIndex({ 'exchange': 1, 'symbol': 1, 'timestamp': -1 });

// Order Flow collection with TTL
db.createCollection('order_flows');
db.order_flows.createIndex({ 'timestamp': 1 }, { expireAfterSeconds: 86400 }); // 24 hours TTL
db.order_flows.createIndex({ 'symbol': 1, 'timestamp': -1 });
db.order_flows.createIndex({ 'exchange': 1, 'symbol': 1, 'timestamp': -1 });

// SMC Analyses collection with TTL
db.createCollection('smc_analyses');
db.smc_analyses.createIndex({ 'timestamp': 1 }, { expireAfterSeconds: 86400 }); // 24 hours TTL
db.smc_analyses.createIndex({ 'symbol': 1, 'timestamp': -1 });
db.smc_analyses.createIndex({ 'bias': 1, 'confidence': -1 });

// API Keys collection (no TTL)
db.createCollection('api_keys');
db.api_keys.createIndex({ 'key': 1 }, { unique: true });
db.api_keys.createIndex({ 'user_id': 1 });
db.api_keys.createIndex({ 'created_at': -1 });

// User sessions (with TTL)
db.createCollection('user_sessions');
db.user_sessions.createIndex({ 'expires_at': 1 }, { expireAfterSeconds: 0 });
db.user_sessions.createIndex({ 'session_id': 1 }, { unique: true });

// System metrics (with TTL)
db.createCollection('system_metrics');
db.system_metrics.createIndex({ 'timestamp': 1 }, { expireAfterSeconds: 259200 }); // 3 days TTL
db.system_metrics.createIndex({ 'metric_type': 1, 'timestamp': -1 });

// Aggregated data collection (longer TTL)
db.createCollection('aggregated_data');
db.aggregated_data.createIndex({ 'timestamp': 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL
db.aggregated_data.createIndex({ 'symbol': 1, 'timeframe': 1, 'timestamp': -1 });
db.aggregated_data.createIndex({ 'data_type': 1, 'symbol': 1, 'timestamp': -1 });

// Insert default API key for development
db.api_keys.insertOne({
  key: 'wadm_dev_master_key_2025',
  user_id: 'system',
  permissions: ['admin', 'read', 'write'],
  created_at: new Date(),
  expires_at: null,
  rate_limit: 1000,
  description: 'Development master key'
});

print('MongoDB initialization completed successfully!');
print('Collections created with appropriate indexes and TTL policies.');
print('Default API key inserted for development use.');
