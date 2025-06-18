#!/bin/bash
# Quick MongoDB Connection Test and Build Script

echo "🔧 wAIckoff MCP MongoDB Setup"
echo "============================"

# Test MongoDB connection
echo "🔍 Testing MongoDB connection..."
npx tsx test-mongodb.ts

if [ $? -eq 0 ]; then
    echo "✅ MongoDB connection successful!"
    
    # Build the project
    echo ""
    echo "🏗️ Building wAIckoff MCP..."
    npm run build
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Build successful!"
        echo ""
        echo "🚀 Ready to start with MongoDB support:"
        echo "   npm start"
    else
        echo "❌ Build failed!"
        exit 1
    fi
else
    echo "❌ MongoDB connection failed!"
    echo "Please ensure MongoDB is running on localhost:27017"
    exit 1
fi
