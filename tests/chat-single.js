#!/usr/bin/env node

// Send a single message to the agent
import { AgentTestClient } from './test-agent-client.js';

const message = process.argv[2];

if (!message) {
  console.error('❌ Please provide a message to send');
  console.log('Usage: npm run chat-message "Your message here"');
  process.exit(1);
}

const client = new AgentTestClient();

try {
  console.log(`👤 User: ${message}`);
  const response = await client.chat(message);
  console.log(`🤖 Agent: ${response}`);
} catch (error) {
  console.error('❌ Chat error:', error.message);
  process.exit(1);
}
