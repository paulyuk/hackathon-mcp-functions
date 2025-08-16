#!/usr/bin/env node

// Simple chat client for the agent service
import { AgentTestClient } from './test-agent-client.js';

const client = new AgentTestClient();

try {
  console.log('🔍 Checking agent health...');
  const health = await client.health();
  console.log('✅ Agent is healthy!');
  console.log('Status:', health.status);
} catch (error) {
  console.error('❌ Agent health check failed:', error.message);
  process.exit(1);
}
