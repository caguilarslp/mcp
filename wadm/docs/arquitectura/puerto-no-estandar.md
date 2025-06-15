# 🌐 WADM - Configuración con Puerto No Estándar

## 📋 Contexto Actualizado

El VPS tiene múltiples servicios:
- WordPress en 80/443
- Plesk en 8443
- Necesitamos un puerto no estándar para WADM

## 🔧 Configuración con Puerto 8920

### 1. **Docker Compose**

```yaml
# docker-compose.yml
version: '3.8'

services:
  # MongoDB (interno, no expuesto)
  mongodb:
    image: mongo:6
    container_name: wadm-mongodb
    environment:
      MONGO_INITDB_ROOT_USERNAME: wadm_admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
      MONGO_INITDB_DATABASE: wadm
    volumes:
      - mongodb-data:/data/db
      - ./docker/mongo/init.js:/docker-entrypoint-initdb.d/init.js
    networks:
      - wadm-net
    restart: unless-stopped

  # Collectors
  binance-collector:
    build: ./src/collectors/binance
    container_name: wadm-binance
    environment:
      MONGO_URI: mongodb://wadm_app:${MONGO_APP_PASSWORD}@mongodb:27017/wadm
      SYMBOLS: "BTCUSDT,ETHUSDT,SOLUSDT"
    depends_on:
      - mongodb
    networks:
      - wadm-net
    restart: unless-stopped

  bybit-collector:
    build: ./src/collectors/bybit
    container_name: wadm-bybit
    environment:
      MONGO_URI: mongodb://wadm_app:${MONGO_APP_PASSWORD}@mongodb:27017/wadm
      SYMBOLS: "BTCUSDT,ETHUSDT,SOLUSDT"
    depends_on:
      - mongodb
    networks:
      - wadm-net
    restart: unless-stopped

  # Data Processor
  processor:
    build: ./src/processors
    container_name: wadm-processor
    environment:
      MONGO_URI: mongodb://wadm_app:${MONGO_APP_PASSWORD}@mongodb:27017/wadm
    depends_on:
      - mongodb
    networks:
      - wadm-net
    restart: unless-stopped

  # MCP Server
  mcp-server:
    build: ./src/mcp-server
    container_name: wadm-mcp-server
    ports:
      - "127.0.0.1:8080:8080"  # Solo accesible localmente
    environment:
      MONGO_URI: mongodb://wadm_app:${MONGO_APP_PASSWORD}@mongodb:27017/wadm
      NODE_ENV: production
      PORT: 8080
    depends_on:
      - mongodb
    networks:
      - wadm-net
    restart: unless-stopped

networks:
  wadm-net:
    driver: bridge
    internal: true  # Red interna, no acceso directo a internet

volumes:
  mongodb-data:
```

### 2. **Nginx Configuración - Puerto 8920**

```nginx
# /etc/nginx/sites-available/wadm
server {
    listen 8920 ssl http2;
    server_name tu-dominio.com;
    
    # SSL Certificates (puedes reusar los del dominio principal)
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # API Documentation
    location = / {
        return 200 '{"service":"WADM API","version":"1.0","endpoints":["/volume_profile/{symbol}","/order_flow/{symbol}","/health"]}';
        add_header Content-Type application/json;
    }
    
    # Main proxy
    location / {
        # Rate limiting
        limit_req zone=wadm_limit burst=30 nodelay;
        
        # Proxy settings
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port 8920;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        
        # CORS
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'X-API-Key, Content-Type';
            add_header 'Access-Control-Max-Age' 86400;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }
    
    # Health check (sin rate limit)
    location = /health {
        proxy_pass http://127.0.0.1:8080/health;
        access_log off;
    }
    
    # Metrics endpoint (requiere auth especial)
    location = /metrics {
        # IP whitelist para monitoring
        allow 127.0.0.1;
        # allow tu.ip.monitoring;
        deny all;
        
        proxy_pass http://127.0.0.1:8080/metrics;
    }
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=wadm_limit:10m rate=60r/m;
```

### 3. **Firewall Configuration**

```bash
# Abrir puerto 8920
sudo ufw allow 8920/tcp comment "WADM API"

# Verificar
sudo ufw status numbered

# Output esperado:
# [X] 8920/tcp  ALLOW IN  Anywhere  # WADM API
```

### 4. **Cliente Configuration**

```typescript
// config/wadm.ts
export const WADM_CONFIG = {
  // URL con puerto no estándar
  baseUrl: process.env.WADM_URL || 'https://tu-dominio.com:8920',
  apiKey: process.env.WADM_API_KEY,
  
  // Timeouts
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  
  // Endpoints
  endpoints: {
    volumeProfile: (symbol: string, timeframe = '1h') => 
      `/volume_profile/${symbol}?timeframe=${timeframe}`,
    orderFlow: (symbol: string, period = '5m') => 
      `/order_flow/${symbol}?period=${period}`,
    health: '/health'
  }
};
```

### 5. **Systemd Service (Opcional)**

```ini
# /etc/systemd/system/wadm.service
[Unit]
Description=WADM Data Manager
After=docker.service
Requires=docker.service

[Service]
Type=simple
Restart=always
RestartSec=10
WorkingDirectory=/opt/wadm
ExecStart=/usr/bin/docker-compose up
ExecStop=/usr/bin/docker-compose down

[Install]
WantedBy=multi-user.target
```

## 🔒 Seguridad Adicional

### API Key Validation (en MCP Server)
```typescript
// middleware/auth.ts
export const validateApiKey = (req: Request, res: Response, next: Next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' });
  }
  
  // Validate against hashed keys in MongoDB
  // ...
};
```

### Monitoreo
```bash
# Verificar que el puerto está escuchando
sudo netstat -tlnp | grep 8920

# Logs de Nginx
tail -f /var/log/nginx/access.log | grep 8920

# Logs de Docker
docker-compose logs -f mcp-server
```

## 📊 URLs Finales

- **Volume Profile**: `https://tu-dominio.com:8920/volume_profile/BTCUSDT`
- **Order Flow**: `https://tu-dominio.com:8920/order_flow/BTCUSDT`
- **Health**: `https://tu-dominio.com:8920/health`
- **API Docs**: `https://tu-dominio.com:8920/`

## 🎯 Ventajas del Puerto 8920

1. **Memorable**: 89-20 es fácil de recordar
2. **No conflictivo**: Raramente usado por otros servicios
3. **Alto pero no demasiado**: En rango de aplicaciones custom
4. **SSL Ready**: Puede usar certificados existentes

---

*Última actualización: 15/06/2025*
