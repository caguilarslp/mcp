#!/bin/sh
# MCP Server diagnostic script

echo "=== MCP Server Diagnostics ==="
echo ""

echo "1. Checking current directory:"
pwd
ls -la

echo ""
echo "2. Checking build directory:"
if [ -d "build" ]; then
    echo "Build directory exists"
    ls -la build/
    if [ -f "build/index.js" ]; then
        echo "✓ build/index.js found"
    else
        echo "✗ build/index.js NOT found"
    fi
else
    echo "✗ Build directory NOT found"
fi

echo ""
echo "3. Checking node_modules:"
if [ -d "node_modules" ]; then
    echo "✓ node_modules exists"
    echo "Total modules: $(ls node_modules | wc -l)"
else
    echo "✗ node_modules NOT found"
fi

echo ""
echo "4. Node.js version:"
node --version

echo ""
echo "5. Testing MCP Server directly:"
if [ -f "build/index.js" ]; then
    echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | timeout 5 node build/index.js 2>&1 | head -20
    echo "Exit code: $?"
else
    echo "Cannot test - build/index.js not found"
fi

echo ""
echo "6. Environment variables:"
env | grep -E "(NODE|MONGO)" | sort

echo ""
echo "=== End Diagnostics ==="
