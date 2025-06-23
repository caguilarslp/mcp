// Simple compile test script
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function compile() {
  try {
    console.log('🔨 Compiling TypeScript...');
    const { stdout, stderr } = await execAsync('npm run build', {
      cwd: 'D:\\projects\\mcp\\waickoff_mcp'
    });
    
    if (stderr) {
      console.error('❌ Compilation errors:', stderr);
      process.exit(1);
    }
    
    console.log('✅ Compilation successful!');
    if (stdout) console.log(stdout);
    
  } catch (error) {
    console.error('❌ Compilation failed:', error);
    process.exit(1);
  }
}

compile();
