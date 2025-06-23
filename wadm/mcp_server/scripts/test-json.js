const testConfig = {
  logDir: 'D:\\projects\\mcp\\waickoff_mcp\\logs',
  maxFileSize: '50MB',
  maxFiles: 10,
  rotationEnabled: true
};
console.log('Test config JSON:');
console.log(JSON.stringify(testConfig, null, 2));
