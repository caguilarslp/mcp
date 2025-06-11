# TASK-015: Dual Storage Pattern (MongoDB Experimental)

## 🎯 Objetivo
Implementar un sistema dual de storage (JSON files + MongoDB) para evaluar beneficios sin romper el sistema actual.

## 📋 Descripción Detallada

### **Contexto**
- Sistema actual JSON funciona perfectamente (v1.4.0)
- Storage modularizado con interfaces limpias (`IStorageService`)
- Necesidad de evaluar MongoDB para datasets grandes y queries complejas
- Implementación experimental sin disruption

### **Aproximación: Dual Storage Pattern**
```
[Application] → [HybridStorageService] → [FileStorageService + MongoStorageService]
                                      ↓
                                 Route by data type
```

## 🏗️ Componentes a Implementar

### **1. MongoDB Infrastructure (2h)**

#### **MongoStorageService**
```typescript
// src/services/storage/mongoStorageService.ts
export class MongoStorageService implements IStorageService {
  private client: MongoClient;
  private db: Db;
  
  constructor(connectionString: string) {}
  
  async save(relativePath: string, data: any): Promise<void>
  async load<T>(relativePath: string): Promise<T | null>
  async query(pattern: string): Promise<string[]>
  async getStorageStats(): Promise<StorageStats>
}
```

#### **MongoDB Connection Manager**
```typescript
// src/services/storage/mongoConnectionManager.ts
export class MongoConnectionManager {
  private static instance: MongoConnectionManager;
  private client: MongoClient;
  
  static getInstance(): MongoConnectionManager
  async connect(connectionString: string): Promise<void>
  getDatabase(name: string): Db
  async disconnect(): Promise<void>
}
```

### **2. Hybrid Storage System (1.5h)**

#### **HybridStorageService**
```typescript
// src/services/storage/hybridStorageService.ts
export class HybridStorageService implements IStorageService {
  constructor(
    private fileStorage: StorageService,
    private mongoStorage: MongoStorageService,
    private config: HybridConfig
  ) {}
  
  async save(path: string, data: any): Promise<void> {
    // Route based on data type or file size
    if (this.shouldUseMongo(path, data)) {
      return this.mongoStorage.save(path, data);
    }
    return this.fileStorage.save(path, data);
  }
  
  private shouldUseMongo(path: string, data: any): boolean {
    // Route large datasets or analysis data to MongoDB
    // Keep config and small files in JSON
  }
}
```

### **3. Schema Definitions (1h)**

#### **MongoDB Collections**
```typescript
// src/types/mongoSchemas.ts
interface AnalysisDocument {
  _id: ObjectId;
  relativePath: string;  // For compatibility
  symbol: string;
  type: 'technical_analysis' | 'complete_analysis';
  timestamp: Date;
  uuid: string;
  data: {
    // Analysis data here
  };
  metadata: {
    version: string;
    engineVersion: string;
    performance: object;
  };
}

interface PatternDocument {
  _id: ObjectId;
  symbol: string;
  type: string;
  confidence: number;
  detectedAt: Date;
  data: object;
}
```

### **4. Configuration & Routing (0.5h)**

#### **Hybrid Configuration**
```typescript
// src/types/hybridStorage.ts
interface HybridConfig {
  mongoEnabled: boolean;
  routingRules: {
    useMongoFor: string[];     // ['analysis/**', 'patterns/**']
    useFileFor: string[];      // ['config/**', 'cache/**']
    sizeLimitMB: number;       // Files > 1MB → MongoDB
  };
  mongodb: {
    connectionString: string;
    database: string;
    options: MongoClientOptions;
  };
}
```

## 🧪 Testing Strategy (1h)

### **A/B Performance Tests**
```typescript
// tests/storage/hybridStorage.test.ts
describe('HybridStorageService Performance', () => {
  test('Large dataset insert: MongoDB vs JSON', async () => {
    const largeData = generateLargeAnalysisData(1000); // 1000 analyses
    
    // JSON performance
    const jsonTime = await measureTime(() => 
      fileStorage.save('test/large.json', largeData)
    );
    
    // MongoDB performance  
    const mongoTime = await measureTime(() =>
      mongoStorage.save('test/large', largeData)
    );
    
    expect(mongoTime).toBeLessThan(jsonTime * 0.7); // 30% faster expected
  });
  
  test('Complex query performance comparison', async () => {
    // Test aggregation queries vs file scanning
  });
});
```

### **Compatibility Tests**
```typescript
describe('Hybrid Storage Compatibility', () => {
  test('Can read existing JSON files through hybrid service', async () => {
    // Ensure backward compatibility
  });
  
  test('Route decisions work correctly', async () => {
    // Test routing logic
  });
});
```

## 📊 Success Metrics

### **Performance Benchmarks**
- **Insert Speed**: MongoDB debe ser >30% más rápido para datasets grandes (>500 registros)
- **Query Speed**: Aggregations complejas >50% más rápidas
- **Memory Usage**: Similar o menor uso de memoria
- **Disk Space**: Comparable (considera compresión MongoDB)

### **Reliability Metrics**
- **Error Rate**: <1% errores adicionales por MongoDB
- **Connection Stability**: >99.9% uptime local
- **Data Consistency**: 100% entre file y mongo storage

### **Developer Experience**
- **Setup Time**: <30 minutos para development environment
- **API Compatibility**: 100% compatible con `IStorageService`
- **Debugging**: MongoDB operations igual de traceable que file ops

## 📁 Archivos a Crear

```
src/services/storage/
├── mongoStorageService.ts        # Core MongoDB implementation
├── mongoConnectionManager.ts     # Connection pooling
├── hybridStorageService.ts       # Dual storage coordinator
└── mongoSchemas.ts              # TypeScript schemas

src/types/
├── mongoStorage.ts              # MongoDB-specific types
└── hybridStorage.ts             # Hybrid configuration types

tests/storage/
├── mongoStorage.test.ts         # MongoDB service tests
├── hybridStorage.test.ts        # Hybrid service tests
└── performance.test.ts          # A/B performance tests

claude/tasks/
└── task-015-results.md          # Benchmark results and decision
```

## 🔧 Implementation Steps

### **Phase 1: MongoDB Foundation (2h)**
1. ✅ Install MongoDB dependencies (`mongodb`, `@types/mongodb`)
2. ✅ Create `MongoConnectionManager` 
3. ✅ Implement `MongoStorageService` básico
4. ✅ Basic connection tests

### **Phase 2: Hybrid System (1.5h)**
1. ✅ Create `HybridStorageService` 
2. ✅ Implement routing logic
3. ✅ Configuration system
4. ✅ Integration tests

### **Phase 3: Performance Testing (1.5h)**
1. ✅ Create benchmark tests
2. ✅ Large dataset tests (1000+ analyses)
3. ✅ Complex query tests (aggregations)
4. ✅ Memory usage profiling

### **Phase 4: Documentation & Decision (1h)**
1. ✅ Document benchmark results
2. ✅ Create comparison matrix
3. ✅ Recommendation for TASK-016
4. ✅ Update architecture docs

## 🎯 Success Criteria

### **Go/No-Go for TASK-016**
- **✅ GO**: MongoDB >30% faster for large operations + setup <30min
- **❌ NO-GO**: MongoDB similar performance + high complexity overhead

### **Backup Plan**
- Si MongoDB no justifica la complejidad:
  - Keep current JSON system
  - Focus en optimizaciones file-based (indexing, compression)
  - Consider lightweight alternatives (SQLite, LevelDB)

## 📝 Dependencies

### **External**
- MongoDB server (local Docker container opcional)
- `mongodb` npm package + types

### **Internal**
- ✅ `IStorageService` interface (ya existente)
- ✅ Current `StorageService` (mantener como fallback)
- ✅ Test infrastructure (Jest configurado)

## 🔮 Future Considerations

### **If TASK-015 is Successful → TASK-016**
- Full migration scripts
- Production deployment strategy
- Advanced MongoDB features (sharding, replica sets)
- Real-time aggregation pipelines

### **If TASK-015 is Not Compelling**
- File storage optimizations
- Consider SQLite for local querying
- Index files for faster searches
- Compression strategies

---

**Tiempo Total Estimado**: 6h
**Riesgo**: BAJO (experimental, no disruptive)
**Valor**: ALTO (data for strategic decision)
