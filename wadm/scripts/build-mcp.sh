#!/bin/bash
# Compile MCP Server for WADM

echo "========================================="
echo "WADM MCP Server Build Script"
echo "========================================="
echo ""

# Change to MCP server directory
cd "$(dirname "$0")/../mcp_server" || exit 1

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found. Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Clean previous build
echo ""
echo "🧹 Cleaning previous build..."
rm -rf build/

# Compile TypeScript
echo "🔨 Compiling TypeScript..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ MCP Server compiled successfully!"
    echo "📁 Build output: mcp_server/build/"
    
    # Verify index.js exists
    if [ -f "build/index.js" ]; then
        echo "✅ Entry point verified: build/index.js"
    else
        echo "❌ Warning: build/index.js not found"
    fi
else
    echo ""
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "========================================="
echo "Build complete. MCP Server ready to use."
echo "========================================="
