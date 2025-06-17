#!/bin/bash
# quick-status.sh - Script de estado rápido para WADM

echo "🚀 WADM - Estado Rápido del Proyecto"
echo "===================================="
echo ""

# Mostrar contexto actual
echo "📋 Contexto Actual:"
head -n 20 .claude_context | tail -n 15
echo ""

# Mostrar últimas entradas del master log
echo "📝 Últimas Entradas del Master Log:"
tail -n 15 claude/master-log.md
echo ""

# Mostrar tareas en progreso
echo "⏳ Tareas en Progreso:"
grep -A 3 "⏳ En Progreso" claude/tasks/task-tracker.md || echo "No hay tareas en progreso"
echo ""

# Mostrar próximas tareas
echo "📅 Próximas Tareas:"
grep -A 5 "📅 Planificada" claude/tasks/task-tracker.md | head -n 15
echo ""

# Mostrar log de hoy si existe
TODAY=$(date +%Y-%m-%d)
if [ -f "claude/logs/$TODAY.md" ]; then
    echo "📊 Log de Hoy ($TODAY):"
    tail -n 10 "claude/logs/$TODAY.md"
else
    echo "📊 No hay log para hoy ($TODAY)"
fi

echo ""
echo "💡 Tip: Para más detalles revisa claude/master-log.md y claude/tasks/task-tracker.md"
