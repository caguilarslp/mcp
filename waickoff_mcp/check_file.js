import fs from 'fs';

// Leer el archivo como buffer para ver caracteres extraños
const filePath = './src/services/technicalAnalysis.ts';
const buffer = fs.readFileSync(filePath);
const content = buffer.toString('utf8');

// Buscar caracteres extraños alrededor de la línea 204
const lines = content.split('\n');
console.log(`Total lines: ${lines.length}`);

// Revisar líneas alrededor de 204
const start = Math.max(0, 200);
const end = Math.min(lines.length, 210);

for (let i = start; i < end; i++) {
  const line = lines[i];
  const hasNonAscii = /[^\x00-\x7F]/.test(line);
  console.log(`Line ${i + 1} ${hasNonAscii ? '(HAS NON-ASCII)' : ''}: ${line.substring(0, 100)}`);
  
  if (hasNonAscii) {
    // Mostrar caracteres específicos
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const code = char.charCodeAt(0);
      if (code > 127) {
        console.log(`  Found non-ASCII at position ${j}: "${char}" (code: ${code})`);
      }
    }
  }
}
