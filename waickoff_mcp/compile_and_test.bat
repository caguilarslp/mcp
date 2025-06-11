@echo off
echo ========================================
echo Building wAIckoff MCP Server...
echo ========================================

npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Build failed!
    exit /b 1
) else (
    echo.
    echo ✅ Build successful!
    echo.
    echo TASK-012 Bull/Bear Trap Detection is now available!
    echo.
    echo New tools added:
    echo - detect_bull_trap
    echo - detect_bear_trap
    echo - get_trap_history
    echo - get_trap_statistics
    echo - configure_trap_detection
    echo - validate_breakout
    echo - get_trap_performance
)
