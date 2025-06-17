# quick-status.ps1 - Script de estado rápido para WADM

Write-Host "🚀 WADM - Estado Rápido del Proyecto" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Mostrar contexto actual
Write-Host "📋 Contexto Actual:" -ForegroundColor Yellow
Get-Content .claude_context | Select-Object -First 20 | Select-Object -Last 15
Write-Host ""

# Mostrar últimas entradas del master log
Write-Host "📝 Últimas Entradas del Master Log:" -ForegroundColor Yellow
Get-Content claude\master-log.md | Select-Object -Last 15
Write-Host ""

# Mostrar tareas en progreso
Write-Host "⏳ Tareas en Progreso:" -ForegroundColor Yellow
$inProgress = Select-String -Path claude\tasks\task-tracker.md -Pattern "⏳ En Progreso" -Context 0,3
if ($inProgress) {
    $inProgress | ForEach-Object { $_.Line; $_.Context.PostContext }
} else {
    Write-Host "No hay tareas en progreso" -ForegroundColor Gray
}
Write-Host ""

# Mostrar próximas tareas
Write-Host "📅 Próximas Tareas:" -ForegroundColor Yellow
$planned = Select-String -Path claude\tasks\task-tracker.md -Pattern "📅 Planificada" -Context 0,5
if ($planned) {
    $planned | Select-Object -First 3 | ForEach-Object { $_.Line; $_.Context.PostContext | Select-Object -First 3 }
}
Write-Host ""

# Mostrar log de hoy si existe
$today = Get-Date -Format "yyyy-MM-dd"
$todayLog = "claude\logs\$today.md"
if (Test-Path $todayLog) {
    Write-Host "📊 Log de Hoy ($today):" -ForegroundColor Yellow
    Get-Content $todayLog | Select-Object -Last 10
} else {
    Write-Host "📊 No hay log para hoy ($today)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "💡 Tip: Para más detalles revisa claude\master-log.md y claude\tasks\task-tracker.md" -ForegroundColor Green
