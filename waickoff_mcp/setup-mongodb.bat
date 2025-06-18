@echo off
REM Quick MongoDB Connection Test and Build Script

echo 🔧 wAIckoff MCP MongoDB Setup
echo ============================

REM Test MongoDB connection
echo 🔍 Testing MongoDB connection...
call npx tsx test-mongodb.ts

if %ERRORLEVEL% EQU 0 (
    echo ✅ MongoDB connection successful!
    
    REM Build the project
    echo.
    echo 🏗️ Building wAIckoff MCP...
    call npm run build
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ✅ Build successful!
        echo.
        echo 🚀 Ready to start with MongoDB support:
        echo    npm start
    ) else (
        echo ❌ Build failed!
        exit /b 1
    )
) else (
    echo ❌ MongoDB connection failed!
    echo Please ensure MongoDB is running on localhost:27017
    exit /b 1
)
