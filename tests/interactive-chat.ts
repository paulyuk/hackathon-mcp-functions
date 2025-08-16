import readline from 'readline';

// Configuration
const AGENT_URL = process.env.AGENT_URL || 'http://localhost:3000';

/**
 * Interactive chat client for the Hackathon Agent Service
 */
class InteractiveChatClient {
  private baseUrl: string;
  private rl: readline.Interface;
  private sessionId: string;

  constructor(baseUrl: string = AGENT_URL) {
    this.baseUrl = baseUrl;
    this.sessionId = 'interactive-chat-' + Date.now();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '👤 You: '
    });
  }

  /**
   * Send a message to the agent
   */
  async chat(message: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message, 
          sessionId: this.sessionId,
          stream: false 
        }),
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
   * Start interactive chat session
   */
  async startChat(): Promise<void> {
    console.log('🤖 Hackathon Agent Interactive Chat');
    console.log('=====================================');
    console.log('💡 Tips:');
    console.log('   • Type "help" for commands');
    console.log('   • Type "quit" or "exit" to end chat');
    console.log('   • Default session: "HackathonAugust2025"');
    console.log('   • Try: "I want to submit a hackathon idea"');
    console.log('');

    // Test connection first
    try {
      const healthResponse = await fetch(`${this.baseUrl}/health`);
      if (!healthResponse.ok) {
        throw new Error(`Agent service not available at ${this.baseUrl}`);
      }
      console.log('✅ Connected to agent service');
    } catch (error) {
      console.error('❌ Cannot connect to agent service:', error);
      console.log('💡 Make sure to run: npm run agent-dev');
      process.exit(1);
    }

    console.log('');
    this.rl.prompt();

    this.rl.on('line', async (input) => {
      const message = input.trim();
      
      if (!message) {
        this.rl.prompt();
        return;
      }

      // Handle special commands
      if (message.toLowerCase() === 'quit' || message.toLowerCase() === 'exit') {
        console.log('👋 Goodbye!');
        this.rl.close();
        return;
      }

      if (message.toLowerCase() === 'help') {
        this.showHelp();
        this.rl.prompt();
        return;
      }

      if (message.toLowerCase() === 'clear') {
        console.clear();
        console.log('🤖 Hackathon Agent Interactive Chat\n');
        this.rl.prompt();
        return;
      }

      try {
        console.log('🤖 Agent: (thinking...)');
        const response = await this.chat(message);
        
        // Clear the "thinking" line and show response
        process.stdout.write('\r\x1b[K'); // Clear current line
        console.log(`🤖 Agent: ${response}`);
        console.log('');
      } catch (error) {
        console.error('❌ Error:', error);
        console.log('');
      }

      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log('\n👋 Chat session ended');
      process.exit(0);
    });
  }

  private showHelp(): void {
    console.log('');
    console.log('🔧 Available Commands:');
    console.log('   help     - Show this help message');
    console.log('   quit     - Exit the chat');
    console.log('   exit     - Exit the chat');
    console.log('   clear    - Clear the screen');
    console.log('');
    console.log('💬 Conversation Examples:');
    console.log('   "Hello, what can you help me with?"');
    console.log('   "I want to submit a hackathon idea"');
    console.log('   "My name is John and email is john@example.com"');
    console.log('   "Show me all submissions"');
    console.log('   "List all users"');
    console.log('   "I want to vote on submissions"');
    console.log('');
    console.log('📝 Default session: "HackathonAugust2025"');
    console.log('');
  }
}

// Start interactive chat
if (import.meta.url === `file://${process.argv[1]}`) {
  const chatClient = new InteractiveChatClient();
  chatClient.startChat().catch(console.error);
}

export { InteractiveChatClient };
