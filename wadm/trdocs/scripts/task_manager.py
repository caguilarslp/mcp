#!/usr/bin/env python3
"""
Task Manager para WADM - Gestión ágil de tareas diarias
"""
import os
from datetime import datetime, timedelta
from pathlib import Path
import re
from typing import List, Dict, Tuple

class TaskManager:
    def __init__(self):
        self.base_path = Path("D:/projects/mcp/wadm/claude/daily")
        self.archive_path = self.base_path / "archive"
        self.today = datetime.now().strftime("%Y-%m-%d")
        
    def get_today_file(self) -> Path:
        """Obtiene el archivo de tareas del día"""
        return self.base_path / f"{self.today}.md"
        
    def add_task(self, priority: str, description: str) -> str:
        """Añade una nueva tarea al día actual"""
        file_path = self.get_today_file()
        
        # Leer contenido actual
        if file_path.exists():
            content = file_path.read_text(encoding='utf-8')
        else:
            content = self._create_daily_template()
            
        # Encontrar siguiente ID
        task_ids = re.findall(r'T(\d{3})', content)
        next_id = f"T{int(max(task_ids, default='000')) + 1:03d}"
        
        # Insertar tarea en la sección correcta
        priority_map = {
            'alta': '🔥 Prioridad Alta',
            'media': '🟡 Prioridad Media',
            'baja': '🔵 Prioridad Baja'
        }
        
        section = priority_map.get(priority.lower(), '🟡 Prioridad Media')
        lines = content.split('\n')
        
        # Buscar la sección y añadir la tarea
        for i, line in enumerate(lines):
            if section in line:
                # Encontrar el final de esta sección
                j = i + 1
                while j < len(lines) and not lines[j].startswith('##'):
                    j += 1
                # Insertar antes del siguiente encabezado
                lines.insert(j - 1, f"- [ ] {next_id}: {description}")
                break
                
        # Guardar archivo actualizado
        file_path.write_text('\n'.join(lines), encoding='utf-8')
        print(f"✅ Tarea {next_id} añadida: {description}")
        return next_id
        
    def complete_task(self, task_id: str) -> bool:
        """Marca una tarea como completada"""
        file_path = self.get_today_file()
        if not file_path.exists():
            print(f"❌ No hay archivo de tareas para hoy")
            return False
            
        content = file_path.read_text(encoding='utf-8')
        lines = content.split('\n')
        task_found = False
        
        for i, line in enumerate(lines):
            if task_id in line and line.strip().startswith('- [ ]'):
                # Mover a completadas
                task_desc = line.replace('- [ ]', '').strip()
                lines[i] = ''  # Eliminar de la ubicación actual
                
                # Añadir a completadas
                for j, l in enumerate(lines):
                    if '## ✅ Completadas' in l:
                        k = j + 1
                        while k < len(lines) and lines[k].strip() and not lines[k].startswith('##'):
                            k += 1
                        lines.insert(k, f"- [x] {task_desc}")
                        task_found = True
                        break
                break
                
        if task_found:
            # Limpiar líneas vacías extras
            lines = [l for l in lines if l != '']
            file_path.write_text('\n'.join(lines), encoding='utf-8')
            print(f"✅ Tarea {task_id} completada")
            return True
        else:
            print(f"❌ Tarea {task_id} no encontrada")
            return False
            
    def carry_forward(self) -> int:
        """Mueve tareas pendientes al día siguiente"""
        today_file = self.get_today_file()
        if not today_file.exists():
            print("No hay tareas que mover")
            return 0
            
        # Leer tareas de hoy
        content = today_file.read_text(encoding='utf-8')
        pending_tasks = self._extract_pending_tasks(content)
        
        if not pending_tasks:
            print("✅ Todas las tareas completadas!")
            self._archive_day()
            return 0
            
        # Crear archivo de mañana
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        tomorrow_file = self.base_path / f"{tomorrow}.md"
        
        # Crear contenido para mañana
        tomorrow_content = self._create_daily_template(tomorrow)
        
        # Insertar tareas pendientes
        lines = tomorrow_content.split('\n')
        insert_idx = 0
        
        for priority, tasks in pending_tasks.items():
            for i, line in enumerate(lines):
                if priority in line:
                    insert_idx = i + 1
                    for task in tasks:
                        lines.insert(insert_idx, task)
                        insert_idx += 1
                    break
                    
        tomorrow_file.write_text('\n'.join(lines), encoding='utf-8')
        
        # Archivar día actual
        self._archive_day()
        
        total = sum(len(tasks) for tasks in pending_tasks.values())
        print(f"📋 {total} tareas movidas a {tomorrow}")
        return total
        
    def _extract_pending_tasks(self, content: str) -> Dict[str, List[str]]:
        """Extrae tareas pendientes del contenido"""
        pending = {
            '🔥 Prioridad Alta': [],
            '🟡 Prioridad Media': [],
            '🔵 Prioridad Baja': []
        }
        
        lines = content.split('\n')
        current_section = None
        
        for line in lines:
            if any(p in line for p in pending.keys()):
                current_section = next(p for p in pending.keys() if p in line)
            elif current_section and line.strip().startswith('- [ ]'):
                pending[current_section].append(line)
            elif '## ✅ Completadas' in line:
                break
                
        return {k: v for k, v in pending.items() if v}
        
    def _create_daily_template(self, date: str = None) -> str:
        """Crea template para un nuevo día"""
        if not date:
            date = self.today
            
        return f"""# Tasks {date}

## 🔥 Prioridad Alta

## 🟡 Prioridad Media  

## 🔵 Prioridad Baja

## ✅ Completadas Hoy

## 📝 Notas del Día

## 🎯 Focus para Mañana

## 💡 Ideas Capturadas
"""
        
    def _archive_day(self):
        """Archiva el archivo del día actual"""
        today_file = self.get_today_file()
        if today_file.exists():
            archive_file = self.archive_path / f"{self.today}.md"
            today_file.rename(archive_file)
            print(f"📁 Día archivado: {self.today}")
            
    def new_day(self):
        """Prepara el nuevo día (ejecutar al inicio)"""
        # Carry forward si hay tareas de ayer
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        yesterday_file = self.base_path / f"{yesterday}.md"
        
        if yesterday_file.exists():
            # Temporalmente cambiar today para procesar ayer
            self.today = yesterday
            self.carry_forward()
            self.today = datetime.now().strftime("%Y-%m-%d")
            
        # Crear archivo de hoy si no existe
        today_file = self.get_today_file()
        if not today_file.exists():
            today_file.write_text(self._create_daily_template(), encoding='utf-8')
            print(f"📅 Nuevo día creado: {self.today}")
            
    def status(self):
        """Muestra estado de tareas del día"""
        file_path = self.get_today_file()
        if not file_path.exists():
            print("No hay archivo de tareas para hoy")
            return
            
        content = file_path.read_text(encoding='utf-8')
        
        # Contar tareas
        pending_high = len(re.findall(r'🔥.*\n(?:.*\n)*?- \[ \]', content))
        pending_med = len(re.findall(r'🟡.*\n(?:.*\n)*?- \[ \]', content))
        pending_low = len(re.findall(r'🔵.*\n(?:.*\n)*?- \[ \]', content))
        completed = len(re.findall(r'- \[x\]', content))
        
        print(f"\n📊 Estado de Tasks - {self.today}")
        print(f"{'='*40}")
        print(f"🔥 Alta:      {pending_high} pendientes")
        print(f"🟡 Media:     {pending_med} pendientes")
        print(f"🔵 Baja:      {pending_low} pendientes")
        print(f"✅ Completadas: {completed}")
        print(f"{'='*40}")
        print(f"📋 Total pendientes: {pending_high + pending_med + pending_low}")


if __name__ == "__main__":
    import sys
    
    tm = TaskManager()
    
    if len(sys.argv) < 2:
        print("Uso:")
        print("  python task_manager.py new_day      - Prepara nuevo día")
        print("  python task_manager.py add [pri] [desc] - Añade tarea")
        print("  python task_manager.py complete [ID]    - Completa tarea")
        print("  python task_manager.py carry        - Mueve pendientes")
        print("  python task_manager.py status       - Ver estado")
        sys.exit(1)
        
    cmd = sys.argv[1]
    
    if cmd == "new_day":
        tm.new_day()
    elif cmd == "add" and len(sys.argv) >= 4:
        priority = sys.argv[2]
        description = ' '.join(sys.argv[3:])
        tm.add_task(priority, description)
    elif cmd == "complete" and len(sys.argv) >= 3:
        tm.complete_task(sys.argv[2])
    elif cmd == "carry":
        tm.carry_forward()
    elif cmd == "status":
        tm.status()
    else:
        print(f"Comando no válido: {cmd}")
