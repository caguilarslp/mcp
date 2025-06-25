@echo off
REM Build MCP Server container only

echo =========================================
echo Building MCP Server Docker Container
echo =========================================
echo.

REM Build MCP container
docker build -f Dockerfile.mcp -t wadm-mcp-server .

if errorlevel 1 (
    echo.
    echo [ERROR] Build failed!
    echo.
    echo Common issues:
    echo - TypeScript version conflicts: Already using --legacy-peer-deps
    echo - Missing files: Check that mcp_server/src exists
    echo - Node modules: .dockerignore should exclude them
    exit /b 1
) else (
    echo.
    echo [OK] MCP Server container built successfully!
    echo.
    echo You can now run: docker-compose up -d mcp-server
)
