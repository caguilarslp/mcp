"""
# MCP HTTP Wrapper Implementation Guide

## Overview
This guide explains how to create an HTTP wrapper for the MCP server to enable REST API access.

## Option 1: Express.js Wrapper (Recommended)

Create `mcp_server/src/httpWrapper.ts`:

```typescript
import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MarketAnalysisEngine } from './core/engine.js';

const app = express();
app.use(express.json());

// Initialize the MCP components
const engine = new MarketAnalysisEngine();
const server = new Server(
  {
    name: 'waickoff-mcp-http',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register all tools with the server
// ... (tool registration code from index.ts)

// HTTP endpoint to call MCP tools
app.post('/call', async (req, res) => {
  const { tool, params } = req.body;
  
  try {
    // Find and execute the tool
    const result = await server.callTool(tool, params);
    
    res.json({
      success: true,
      result: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      tool: tool
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.10.1',
    tools: server.getRegisteredTools().length
  });
});

// List tools endpoint
app.get('/tools', (req, res) => {
  const tools = server.getRegisteredTools();
  res.json(tools);
});

const PORT = process.env.MCP_HTTP_PORT || 3001;
app.listen(PORT, () => {
  console.log(`MCP HTTP Wrapper listening on port ${PORT}`);
});
```

## Option 2: Use the Python subprocess approach (Currently Implemented)

The current implementation uses Python's subprocess to communicate with the MCP server directly.
This works but has limitations:
- Each call spawns a new process
- No persistent state between calls
- Higher latency

## Option 3: WebSocket Bridge

Create a WebSocket bridge that maintains a persistent connection to the MCP server:

```python
import asyncio
import websockets
import json

async def mcp_bridge(websocket, path):
    # Connect to MCP server via stdio
    process = await asyncio.create_subprocess_exec(
        'node', 'mcp_server/build/index.js',
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    
    # Handle WebSocket messages
    async for message in websocket:
        request = json.loads(message)
        
        # Send to MCP
        process.stdin.write(json.dumps(request).encode() + b'\n')
        await process.stdin.drain()
        
        # Get response
        response = await process.stdout.readline()
        await websocket.send(response.decode())

# Start WebSocket server
start_server = websockets.serve(mcp_bridge, "localhost", 8765)
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
```

## Current Status

The WADM API is configured to work with mock responses until one of these wrappers is implemented.
This allows immediate testing and development while the HTTP wrapper is being built.

To switch from mock to real MCP:
1. Implement one of the wrapper options above
2. Update `MCP_HTTP_URL` environment variable
3. Modify `client_http.py` to make real HTTP calls instead of returning mock data

## Testing

Use `test_mcp_integration.py` to verify the integration:
```bash
python test_mcp_integration.py
```

This will test:
- Health check
- Tool listing
- Basic tool calls
- Wyckoff analysis
- Complete market analysis
"""