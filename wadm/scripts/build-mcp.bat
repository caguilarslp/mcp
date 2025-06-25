@echo off
REM Compile MCP Server for WADM

echo =========================================
echo WADM MCP Server Build Script
echo =========================================
echo.

REM Change to MCP server directory
cd /d "%~dp0\..\mcp_server" || exit /b 1

REM Check if node_modules exists
if not exist "node_modules" (
    echo [WARNING] node_modules not found. Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        exit /b 1
    )
    echo [OK] Dependencies installed
) else (
    echo [OK] Dependencies already installed
)

REM Clean previous build
echo.
echo Cleaning previous build...
if exist "build" rd /s /q "build"

REM Compile TypeScript
echo Compiling TypeScript...
call npm run build

if errorlevel 1 (
    echo.
    echo [ERROR] Build failed!
    exit /b 1
) else (
    echo.
    echo [OK] MCP Server compiled successfully!
    echo [OK] Build output: mcp_server\build\
    
    REM Verify index.js exists
    if exist "build\index.js" (
        echo [OK] Entry point verified: build\index.js
    ) else (
        echo [WARNING] build\index.js not found
    )
)

echo.
echo =========================================
echo Build complete. MCP Server ready to use.
echo =========================================
