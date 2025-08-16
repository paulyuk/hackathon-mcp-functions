// Configuration
const AGENT_URL = process.env.AGENT_URL || 'http://localhost:3000';

/**
 * Simple test client for the Hackathon Agent Service
 */
class AgentTestClient {
  private baseUrl: string;

  constructor(baseUrl: string = AGENT_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Send a message to the agent
   */
  async chat(message: string, stream: boolean = false): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, stream }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as any;
      return data.response;
    } catch (error) {
      console.error('Chat error:', error);
      throw error;
    }
  }

  /**
   * Get health status
   */
  async health(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }

  /**
   * Get available MCP tools
   */
  async getTools(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/tools`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Tools listing error:', error);
      throw error;
    }
  }
}

/**
 * Interactive test session
 */
async function runInteractiveTest() {
  const client = new AgentTestClient();
  
  console.log('🚀 Hackathon Agent Test Client');
  console.log('==============================');
  
  // Health check
  try {
    const health = await client.health();
    console.log('✅ Health check:', health.status);
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return;
  }

  // List tools
  try {
    const tools = await client.getTools();
    console.log('🔧 Available tools:', tools.tools.map((t: any) => t.name).join(', '));
  } catch (error) {
    console.error('❌ Failed to list tools:', error);
  }

  // Test conversations
  const testMessages = [
    "Hello! I want to submit a hackathon idea.",
    "My name is Alice Johnson and my email is alice@example.com",
    "I want to create an AI learning platform for personalized education",
    "Yes, please submit it to session hackathon-aug-2025",
    "Can you show me other submissions in this session?"
  ];

  console.log('\n🗣️  Starting test conversation...\n');
  
  for (const message of testMessages) {
    try {
      console.log(`👤 User: ${message}`);
      const response = await client.chat(message);
      console.log(`🤖 Agent: ${response}\n`);
      
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('❌ Chat error:', error);
      break;
    }
  }
}

/**
 * Single message test
 */
async function testSingleMessage(message: string) {
  const client = new AgentTestClient();
  
  try {
    console.log(`👤 User: ${message}`);
    const response = await client.chat(message);
    console.log(`🤖 Agent: ${response}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Command line interface
const args = process.argv.slice(2);

if (args.length === 0) {
  // Run interactive test
  runInteractiveTest().catch(console.error);
} else if (args[0] === '--message' && args[1]) {
  // Test single message
  testSingleMessage(args[1]).catch(console.error);
} else if (args[0] === '--health') {
  // Health check only
  const client = new AgentTestClient();
  client.health()
    .then(health => console.log('Health:', health))
    .catch(console.error);
} else if (args[0] === '--tools') {
  // List tools only
  const client = new AgentTestClient();
  client.getTools()
    .then(tools => console.log('Tools:', JSON.stringify(tools, null, 2)))
    .catch(console.error);
} else {
  console.log('Usage:');
  console.log('  npm run test-client                    # Interactive test');
  console.log('  npm run test-client -- --message "hi"  # Single message');
  console.log('  npm run test-client -- --health        # Health check');
  console.log('  npm run test-client -- --tools         # List tools');
}

export { AgentTestClient };
