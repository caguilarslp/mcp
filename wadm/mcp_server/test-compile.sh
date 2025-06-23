#!/bin/bash
echo "🔄 Compiling wAIckoff MCP Server..."

cd /mnt/d/projects/mcp/waickoff_mcp

# Run TypeScript compilation
npm run build

echo "✅ Compilation check completed!"
