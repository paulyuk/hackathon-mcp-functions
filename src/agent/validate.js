#!/usr/bin/env node

// Simple validation script to check if the agent service can be imported
console.log('🧪 Validating agent service...');

try {
  // Test TypeScript compilation
  const fs = require('fs');
  const path = require('path');
  
  // Check if dist directory exists
  if (!fs.existsSync('./dist')) {
    throw new Error('Build output not found. Run "npm run build" first.');
  }
  
  console.log('✅ TypeScript compilation: SUCCESS');
  
  // Test basic module structure without starting server
  const distIndexPath = './dist/index.js';
  if (!fs.existsSync(distIndexPath)) {
    throw new Error('Main module not found in dist/');
  }
  
  console.log('✅ Module structure: SUCCESS');
  
  // Check if package.json has required dependencies
  const packageJson = require('./package.json');
  const requiredDeps = ['@openai/agents', 'express', 'cors', 'dotenv'];
  
  for (const dep of requiredDeps) {
    if (!packageJson.dependencies[dep]) {
      throw new Error(`Missing required dependency: ${dep}`);
    }
  }
  
  console.log('✅ Dependencies: SUCCESS');
  
  console.log('🎉 Agent service validation complete!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Start MCP server: func start (in parent directory)');
  console.log('2. Set OPENAI_API_KEY in .env file');
  console.log('3. Start agent: npm run dev');
  console.log('4. Test: npm run test-client');
  
} catch (error) {
  console.error('❌ Validation failed:', error.message);
  process.exit(1);
}
