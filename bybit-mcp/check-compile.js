// TypeScript compilation test
const fs = require('fs');
const { exec } = require('child_process');

console.log('🔍 Checking TypeScript compilation...');

exec('npx tsc --noEmit', (error, stdout, stderr) => {
  console.log('=== COMPILATION CHECK RESULTS ===');
  
  if (error) {
    console.error('❌ TypeScript errors found:');
    console.error(error.message);
  }
  
  if (stderr) {
    console.log('⚠️ TypeScript warnings/errors:');
    console.log(stderr);
  }
  
  if (stdout) {
    console.log('📝 TypeScript output:');
    console.log(stdout);
  }
  
  if (!error && !stderr) {
    console.log('✅ No TypeScript errors found!');
    
    // Now compile
    console.log('\n🔨 Compiling...');
    exec('npx tsc', (buildError, buildStdout, buildStderr) => {
      if (buildError) {
        console.error('❌ Build failed:', buildError.message);
        return;
      }
      
      if (buildStderr) {
        console.log('⚠️ Build warnings:', buildStderr);
      }
      
      console.log('✅ Build completed successfully!');
      console.log('📁 Build output in ./build/');
    });
  }
});
