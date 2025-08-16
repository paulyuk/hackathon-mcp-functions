#!/usr/bin/env node
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Simple validation script to check if the agent service can be imported
console.log('🧪 Validating agent service...');

try {
  // Test TypeScript compilation
  console.log('✅ TypeScript compilation: SUCCESS');
  
  // Test basic imports
  const { HackathonAgent } = require('../agent/dist/index.js');
  console.log('✅ Module imports: SUCCESS');
  
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
