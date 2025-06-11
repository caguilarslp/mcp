# TASK-016: Migración Completa a MongoDB

## 🎯 Objetivo
**CONDICIONAL**: Migración total del sistema de storage desde archivos JSON a MongoDB, **SOLO** si TASK-015 demuestra beneficios sustanciales.

## 📋 Prerequisitos para Activación

### **Criterios Go/No-Go (basados en TASK-015)**
- ✅ **Performance**: MongoDB >30% más rápido en operaciones grandes
- ✅ **Setup Simplicity**: Environment setup <30 minutos
- ✅ **Reliability**: <1% error rate adicional
- ✅ **Developer Experience**: APIs igual de fáciles de usar
- ✅ **Operational Overhead**: Deployment no significativamente más complejo

### **Red Flags que Cancelarían TASK-016**
- ❌ Performance similar o peor que JSON files
- ❌ Setup complejo (>1h para development)
- ❌ Alta incidencia de connection issues
- ❌ Significant operational overhead
- ❌ Memory usage significativamente mayor

## 🏗️ Componentes de Migración Completa

### **1. Migration Infrastructure (3h)**

#### **Data Migration Scripts**
```typescript
// scripts/migration/jsonToMongo.ts
export class JsonToMongoMigrator {
  constructor(
    private sourceStorage: StorageService,
    private targetStorage: MongoStorageService
  ) {}
  
  async migrateAllData(): Promise<MigrationReport> {
    // Migrate analysis data
    await this.migrateAnalyses();
    
    // Migrate patterns
    await this.migratePatterns();
    
    // Migrate reports
    await this.migrateReports();
    
    // Validate data integrity
    return this.validateMigration();
  }
  
  private async migrateAnalyses(): Promise<void> {
    const analyses = await this.sourceStorage.query('analysis/**/*.json');
    
    for (const path of analyses) {
      const data = await this.sourceStorage.load(path);
      await this.targetStorage.save(path, data);
    }
  }
}
```

#### **Data Validation Tools**
```typescript
// scripts/migration/validator.ts
export class MigrationValidator {
  async validateCompleteIntegrity(): Promise<ValidationReport> {
    // Compare record counts
    // Validate data consistency
    // Check for missing records
    // Verify query results match
  }
}
```

### **2. Production MongoDB Setup (2h)**

#### **Docker Compose for Development**
```yaml
# docker/docker-compose.yml
version: '3.8'
services:
  mongodb:
    image: mongo:7.0
    container_name: waickoff-mongo
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: waickoff
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongodb_data:/data/db
      - ./init-scripts:/docker-entrypoint-initdb.d
    networks:
      - waickoff-network

volumes:
  mongodb_data:

networks:
  waickoff-network:
```

#### **Production Configuration**
```typescript
// src/config/mongodb.production.ts
export const ProductionMongoConfig = {
  connectionString: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  database: 'waickoff_mcp',
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority',
    readPreference: 'primary',
    authSource: 'admin'
  }
};
```

### **3. Advanced MongoDB Features (2h)**

#### **Optimized Collections & Indexes**
```typescript
// src/services/storage/mongoCollections.ts
export class MongoCollections {
  async setupCollections(db: Db): Promise<void> {
    // Analysis collection with time-series optimization
    await db.createCollection('analyses', {
      timeseries: {
        timeField: 'timestamp',
        metaField: 'metadata',
        granularity: 'minutes'
      }
    });
    
    // Indexes for performance
    await db.collection('analyses').createIndexes([
      { key: { symbol: 1, timestamp: -1 } },
      { key: { type: 1, timestamp: -1 } },
      { key: { 'metadata.uuid': 1 }, unique: true }
    ]);
    
    // Patterns collection
    await db.createCollection('patterns', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['symbol', 'type', 'confidence', 'detectedAt'],
          properties: {
            confidence: { bsonType: 'double', minimum: 0, maximum: 100 }
          }
        }
      }
    });
  }
}
```

#### **Advanced Aggregation Pipelines**
```typescript
// src/services/storage/mongoAggregations.ts
export class MongoAggregations {
  // Market summary aggregation
  async getMarketSummary(timeframe: string): Promise<MarketSummary> {
    return db.collection('analyses').aggregate([
      {
        $match: {
          timestamp: { $gte: this.getTimeframeCutoff(timeframe) }
        }
      },
      {
        $group: {
          _id: '$symbol',
          latestPrice: { $last: '$data.ticker.lastPrice' },
          priceChange24h: { $last: '$data.ticker.price24hPcnt' },
          volume24h: { $sum: '$data.ticker.volume24h' },
          analysisCount: { $sum: 1 }
        }
      },
      {
        $sort: { volume24h: -1 }
      }
    ]).toArray();
  }
  
  // Pattern frequency analysis
  async getPatternFrequency(): Promise<PatternStats[]> {
    return db.collection('patterns').aggregate([
      {
        $group: {
          _id: { type: '$type', symbol: '$symbol' },
          count: { $sum: 1 },
          avgConfidence: { $avg: '$confidence' },
          lastDetected: { $max: '$detectedAt' }
        }
      }
    ]).toArray();
  }
}
```

### **4. Storage Service Replacement (2h)**

#### **Complete MongoDB StorageService**
```typescript
// src/services/storage.ts (REPLACED)
export class StorageService implements IStorageService {
  private mongo: MongoStorageService;
  private aggregations: MongoAggregations;
  
  constructor() {
    this.mongo = new MongoStorageService();
    this.aggregations = new MongoAggregations();
  }
  
  // All IStorageService methods implemented with MongoDB
  async save(path: string, data: any): Promise<void> {
    return this.mongo.save(path, data);
  }
  
  // Enhanced methods only possible with MongoDB
  async getMarketSummary(timeframe: string): Promise<MarketSummary> {
    return this.aggregations.getMarketSummary(timeframe);
  }
  
  async findPatternTrends(): Promise<PatternTrend[]> {
    return this.aggregations.getPatternFrequency();
  }
}
```

### **5. New MongoDB-Only Features (1.5h)**

#### **Real-time Aggregations**
```typescript
// src/services/analytics/realtimeAnalytics.ts
export class RealtimeAnalytics {
  async getTopMovers(limit: number = 10): Promise<TopMover[]> {
    // Real-time calculation of biggest movers
  }
  
  async getVolumeLeaders(): Promise<VolumeLeader[]> {
    // Real-time volume leaders
  }
  
  async getPatternAlerts(): Promise<PatternAlert[]> {
    // Recent high-confidence patterns
  }
}
```

#### **Enhanced MCP Tools**
```typescript
// New MCP tools only possible with MongoDB
- get_realtime_market_summary
- get_pattern_trends  
- get_volume_leaders
- get_correlation_matrix
- get_advanced_analytics
```

## 📊 Migration Timeline

### **Phase 1: Infrastructure Setup (2h)**
1. ✅ Docker environment configured
2. ✅ Production MongoDB setup documented
3. ✅ Connection management production-ready
4. ✅ Security & authentication configured

### **Phase 2: Data Migration (3h)**
1. ✅ Migration scripts tested on copy of data
2. ✅ Data validation tools proven
3. ✅ Complete migration executed
4. ✅ Data integrity verified 100%

### **Phase 3: Service Replacement (2h)**
1. ✅ StorageService completely replaced
2. ✅ All existing APIs working identically
3. ✅ Enhanced features implemented
4. ✅ Tests updated and passing

### **Phase 4: Advanced Features (1.5h)**
1. ✅ Real-time aggregations implemented
2. ✅ New MCP tools created
3. ✅ Performance optimizations applied
4. ✅ Documentation updated

## 🔧 Deployment Strategy

### **Zero-Downtime Migration**
1. **Setup MongoDB alongside current system**
2. **Run dual-write for 24h** (write to both storages)
3. **Validate data consistency**
4. **Switch reads to MongoDB**
5. **Deprecate file storage after 48h**

### **Rollback Plan**
- Keep file storage for 1 week as backup
- Quick rollback script if issues detected
- Data export from MongoDB → JSON if needed

## 📋 Success Metrics

### **Performance Targets**
- **Query Speed**: >50% improvement on complex queries
- **Insert Speed**: >30% improvement on bulk operations
- **Memory Usage**: Similar or better than file storage
- **Startup Time**: <5 seconds additional for MongoDB connection

### **Reliability Targets**
- **Uptime**: >99.9% (including MongoDB)
- **Data Loss**: 0% during migration
- **Error Rate**: <0.1% MongoDB-related errors

## 📁 New Files to Create

```
scripts/migration/
├── jsonToMongo.ts              # Main migration script
├── validator.ts                # Data validation
├── rollback.ts                 # Emergency rollback
└── performance.ts              # Performance testing

docker/
├── docker-compose.yml          # Development environment
├── docker-compose.prod.yml     # Production setup
└── init-scripts/              # MongoDB initialization

src/services/analytics/
├── realtimeAnalytics.ts        # Real-time aggregations
└── advancedQueries.ts          # Complex MongoDB queries

src/config/
├── mongodb.production.ts       # Production config
└── mongodb.development.ts      # Development config

claude/docs/
├── mongodb-migration-guide.md  # Complete migration guide
└── mongodb-operations.md       # Day-to-day operations
```

## 🚨 Risk Mitigation

### **Technical Risks**
- **Connection Issues**: Implement robust retry logic + connection pooling
- **Performance Regression**: Extensive benchmarking before cutover
- **Data Corruption**: Multiple validation layers + checksums

### **Operational Risks**
- **Deployment Complexity**: Docker Compose simplifies setup
- **Monitoring**: MongoDB metrics + health checks
- **Backup Strategy**: Automated daily backups + point-in-time recovery

## 📈 Expected Benefits (Post-Migration)

### **Performance Improvements**
- **50-70% faster** complex queries (aggregations, joins)
- **30-40% faster** bulk inserts for large datasets
- **Real-time analytics** not possible with file storage

### **New Capabilities**
- **Advanced aggregations** for market insights
- **Time-series optimizations** for historical analysis
- **Real-time dashboards** potential
- **Cross-symbol correlations** efficient

### **Developer Experience**
- **Richer query language** (MongoDB aggregation framework)
- **Better testing** (in-memory MongoDB for tests)
- **Easier analytics** (native aggregation vs custom code)

---

**⚠️ REMINDER**: Esta task solo se activa si TASK-015 demuestra beneficios claros.

**Tiempo Total Estimado**: 8-12h
**Riesgo**: MEDIO (system replacement)
**Valor**: ALTO (if justified by TASK-015 results)
