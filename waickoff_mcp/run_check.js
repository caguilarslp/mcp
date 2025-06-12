const { execSync } = require('child_process');

console.log('=== Checking for file corruption ===');
try {
  const result = execSync('node check_file.js', { encoding: 'utf8', cwd: 'D:\\projects\\mcp\\waickoff_mcp' });
  console.log(result);
} catch (error) {
  console.log('Error checking file:', error.message);
}

console.log('\n=== Attempting TypeScript compilation ===');
try {
  const result = execSync('npm run build', { 
    encoding: 'utf8', 
    cwd: 'D:\\projects\\mcp\\waickoff_mcp',
    stdio: 'pipe'
  });
  console.log('✅ Compilation successful!');
  console.log(result);
} catch (error) {
  console.log('❌ Compilation failed:');
  console.log('STDOUT:', error.stdout || 'No stdout');
  console.log('STDERR:', error.stderr || 'No stderr');
}
