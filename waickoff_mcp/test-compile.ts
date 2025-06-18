// Test compilation
console.log("Testing TypeScript compilation...");

import { spawnSync } from 'child_process';

const result = spawnSync('npx', ['tsc', '--noEmit'], {
  encoding: 'utf-8',
  shell: true
});

if (result.error) {
  console.error('Error running tsc:', result.error);
} else {
  console.log('Exit code:', result.status);
  if (result.stdout) console.log('stdout:', result.stdout);
  if (result.stderr) console.log('stderr:', result.stderr);
}
