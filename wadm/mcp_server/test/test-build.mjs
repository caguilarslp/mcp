import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

async function runBuild() {
  try {
    console.log('🔨 Starting TypeScript compilation...');
    
    const { stdout, stderr } = await execAsync('npm run build', {
      cwd: 'D:\\projects\\mcp\\waickoff_mcp',
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    console.log('✅ Build completed successfully!');
    console.log('STDOUT:', stdout);
    
    if (stderr) {
      console.log('STDERR:', stderr);
    }
    
  } catch (error) {
    console.log('❌ Build failed!');
    console.log('Error:', error.message);
    if (error.stdout) {
      console.log('STDOUT:', error.stdout);
    }
    if (error.stderr) {
      console.log('STDERR:', error.stderr);
    }
  }
}

runBuild();
