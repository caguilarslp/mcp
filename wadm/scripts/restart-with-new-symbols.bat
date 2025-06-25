@echo off
echo ========================================
echo WADM - Reinicio con Símbolos de Utilidad
echo ========================================
echo.
echo Configuración centralizada en docker-compose.yml
echo Total: 24 símbolos de utilidad (NO memes)
echo.
echo - Referencias (4): BTC, ETH, SOL, TRON
echo - ISO20022 (6): XRP, XLM, HBAR, ADA, QNT, ALGO  
echo - RWA (6): ONDO, LINK, POLYX, TRU, RIO, MANTRA
echo - AI (8): RENDER, ICP, FET, OCEAN, AGIX, TAO, VIRTUAL, ARKM
echo.

echo [1/4] Parando contenedores...
docker-compose down

echo [2/4] Reconstruyendo con nueva configuración...
docker-compose build --no-cache

echo [3/4] Iniciando con nuevos símbolos...
docker-compose up -d

echo [4/4] Verificando estado...
timeout /t 10 /nobreak > nul
docker-compose ps

echo.
echo ========================================
echo Sistema reiniciado con símbolos de utilidad
echo Logs: docker-compose logs -f
echo ========================================
pause 