@echo off
echo Cleaning up test analysis files...
echo.

set BASE_PATH=D:\projects\mcp\waickoff_mcp\storage\analysis

echo Cleaning BTCUSDT...
del /Q "%BASE_PATH%\BTCUSDT\*.json" 2>nul

echo Cleaning ETHUSDT...
del /Q "%BASE_PATH%\ETHUSDT\*.json" 2>nul

echo Cleaning ADAUSDT...
del /Q "%BASE_PATH%\ADAUSDT\*.json" 2>nul

echo Cleaning HBARUSDT...
del /Q "%BASE_PATH%\HBARUSDT\*.json" 2>nul

echo Cleaning KASUSDT...
del /Q "%BASE_PATH%\KASUSDT\*.json" 2>nul

echo Cleaning XRPUSDT...
del /Q "%BASE_PATH%\XRPUSDT\*.json" 2>nul

echo.
echo Cleanup complete!
echo.

echo Run the following command to verify:
echo dir /s "%BASE_PATH%\*.json"
