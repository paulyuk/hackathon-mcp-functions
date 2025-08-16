#!/usr/bin/env node

// Simple interactive chat client for the agent service
import { AgentTestClient } from './test-agent-client.js';

const client = new AgentTestClient();

console.log('🚀 Hackathon Agent Chat Client');
console.log('==============================');

// Health check first
try {
  const health = await client.health();
  console.log('✅ Health check:', health.status);
} catch (error) {
  console.error('❌ Health check failed:', error.message);
  process.exit(1);
}

// List tools
try {
  const tools = await client.getTools();
  console.log('🔧 Available tools:', tools.tools.map(t => t.name).join(', '));
} catch (error) {
  console.error('❌ Failed to list tools:', error.message);
}

// Demo conversation
const testMessages = [
  "Hello! Can you confirm you're using Azure OpenAI with Entra identity?",
  "I want to submit a hackathon idea.",
  "My name is Alice Johnson and my email is alice@example.com", 
  "I want to create an AI learning platform for personalized education",
  "Yes, please submit it to session hackathon-aug-2025",
  "Can you show me other submissions in this session?",
  "List all registered users to verify MCP tools are working"
];

console.log('\n🗣️  Starting demo conversation...\n');

for (const message of testMessages) {
  try {
    console.log(`👤 User: ${message}`);
    const response = await client.chat(message);
    console.log(`🤖 Agent: ${response}\n`);
    
    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    console.error('❌ Chat error:', error.message);
    break;
  }
}

console.log('✅ Demo conversation complete!');
