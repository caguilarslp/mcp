# MCP Server Docker Integration Plan

## Current Status
- MCP Server funciona pero envía logs a stdout
- HTTP wrapper filtra logs pero es frágil
- Necesitamos imagen Docker dedicada del MCP

## Integration Strategy

### Option 1: Official MCP Docker Image (Recommended)
```yaml
services:
  mcp-server:
    image: waickoff/mcp-server:1.10.1
    container_name: wadm-mcp-server
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/wadm
      - LOG_MODE=file  # or stderr
      - SUPPRESS_STARTUP=true
    networks:
      - wadm-network
```

### Option 2: Build from Source (Current)
- Requiere manejar conflictos de TypeScript
- Necesita filtrar logs en wrapper
- Más complejo de mantener

## Benefits of Official Image
1. **Maintained by MCP team** - Actualizaciones automáticas
2. **Optimized for production** - Sin logs en stdout
3. **Proper versioning** - Tags semánticos
4. **Smaller size** - Multi-stage build
5. **Pre-configured** - Listo para usar

## HTTP Wrapper Simplification

Con imagen oficial, el wrapper sería más simple:

```python
async def send_request(self, method: str, params: Dict) -> Dict:
    """Send request and get response - no log filtering needed."""
    request = {
        "jsonrpc": "2.0",
        "method": method,
        "params": params,
        "id": self.request_id
    }
    
    # Send
    self.process.stdin.write(json.dumps(request) + "\n")
    await self.process.stdin.drain()
    
    # Receive - direct JSON parsing
    response_line = await self.process.stdout.readline()
    return json.loads(response_line)
```

## Migration Path

1. **Get official image** from MCP project
2. **Test locally** with docker-compose
3. **Update wrapper** to remove log filtering
4. **Performance test** with all 119+ tools
5. **Deploy** to production

## Alternative: Sidecar Pattern

Si la imagen oficial no está lista:

```yaml
services:
  mcp-bundle:
    build: ./mcp-bundle
    contains:
      - mcp-server (Node.js)
      - http-wrapper (Python)
    ports:
      - "3000:3000"
```

## Next Steps

1. ✅ Request Docker image from MCP chat
2. ⏳ Test image when available
3. ⏳ Simplify HTTP wrapper
4. ⏳ Update documentation
5. ⏳ Performance optimization

## Testing Checklist

When image is ready:
- [ ] All 119+ tools accessible
- [ ] No stdout pollution
- [ ] Proper error handling
- [ ] MongoDB connection works
- [ ] Health checks pass
- [ ] Performance acceptable
- [ ] Memory usage stable

## Documentation Updates

Update these files when migrating:
- `docker-compose.yml`
- `claude/docs/MCP-INTEGRATION-ARCHITECTURE.md`
- `claude/bugs/BUG-002-mcp-mock-implementation.md`
- `.claude_context`
