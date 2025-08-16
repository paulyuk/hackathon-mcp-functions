import { Agent, run, OpenAIChatCompletionsModel, MCPServerStreamableHttp, AgentInputItem } from '@openai/agents';
import { DefaultAzureCredential } from '@azure/identity';
import { AzureOpenAI } from 'openai';
import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Configuration
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:7071/mcp';
const PORT = process.env.PORT || 3000;

// Azure OpenAI Configuration
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT;
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview';
const USE_AZURE_IDENTITY = process.env.USE_AZURE_IDENTITY === 'true';

/**
 * Simple conversation storage using proper OpenAI Agents pattern
 */
const conversations = new Map<string, AgentInputItem[]>();
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const lastActivity = new Map<string, number>();

function cleanupOldConversations() {
  const now = Date.now();
  for (const [sessionId, timestamp] of lastActivity.entries()) {
    if (now - timestamp > SESSION_TIMEOUT) {
      conversations.delete(sessionId);
      lastActivity.delete(sessionId);
    }
  }
}

function getConversationHistory(sessionId: string): AgentInputItem[] {
  cleanupOldConversations();
  if (!conversations.has(sessionId)) {
    conversations.set(sessionId, []);
  }
  lastActivity.set(sessionId, Date.now());
  return conversations.get(sessionId)!;
}

function updateConversationHistory(sessionId: string, history: AgentInputItem[]) {
  conversations.set(sessionId, history);
  lastActivity.set(sessionId, Date.now());
}

/**
 * Load agent instructions from markdown file
 */
function loadAgentInstructions(): string {
  try {
    const promptPath = path.join(__dirname, '../../../.github/agent_prompt.md');
    const promptContent = fs.readFileSync(promptPath, 'utf-8');
    
    // Remove the markdown code block markers if present
    const lines = promptContent.split('\n');
    
    // Find the start and end of the content
    let startIdx = 0;
    let endIdx = lines.length;
    
    // Skip markdown code block start
    if (lines[0] && lines[0].startsWith('```')) {
      startIdx = 1;
    }
    
    // Skip markdown code block end
    if (lines[lines.length - 1] && lines[lines.length - 1].startsWith('```')) {
      endIdx = lines.length - 1;
    }
    
    const contentLines = lines.slice(startIdx, endIdx);
    return contentLines.join('\n').trim();
  } catch (error) {
    console.error('Error loading agent instructions:', error);
    return 'You are a helpful hackathon coordinator. Use the default session "HackathonAugust2025" for all operations.';
  }
}

/**
 * Initialize OpenAI client with Azure configuration
 */
function createOpenAIClient() {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT) {
    throw new Error('Azure OpenAI configuration missing. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_DEPLOYMENT');
  }

  console.log('🔑 Azure OpenAI Configuration:');
  console.log(`   - Endpoint: ${AZURE_OPENAI_ENDPOINT}`);
  console.log(`   - Deployment: ${AZURE_OPENAI_DEPLOYMENT}`);
  console.log(`   - Using Identity: ${USE_AZURE_IDENTITY}`);

  if (USE_AZURE_IDENTITY) {
    const credential = new DefaultAzureCredential();
    
    return new AzureOpenAI({
      endpoint: AZURE_OPENAI_ENDPOINT,
      azureADTokenProvider: async () => {
        try {
          const token = await credential.getToken('https://cognitiveservices.azure.com/.default');
          console.log(`   - Has Token: ${!!token.token}`);
          return token.token;
        } catch (error) {
          console.error('Token acquisition failed:', error);
          throw error;
        }
      },
      apiVersion: AZURE_OPENAI_API_VERSION,
      deployment: AZURE_OPENAI_DEPLOYMENT,
    });
  } else {
    throw new Error('API key authentication not implemented. Please use Azure Identity (USE_AZURE_IDENTITY=true)');
  }
}

/**
 * Initialize the agent with Azure OpenAI and MCP server
 */
async function createAgent() {
  try {
    console.log('🤖 Initializing Hackathon Agent...');

    // Load agent instructions
    const agentInstructions = loadAgentInstructions();
    console.log('📝 Loaded agent instructions');

    // Create OpenAI client
    const client = createOpenAIClient();

    // Create MCP server connection
    const mcpServer = new MCPServerStreamableHttp({ url: MCP_SERVER_URL });
    console.log(`🔌 Connecting to MCP server at ${MCP_SERVER_URL}`);
    
    // Connect to the MCP server
    await mcpServer.connect();
    console.log('✅ MCP server connected');

    // Create the agent
    const agent = new Agent({
      name: 'Hackathon Coordinator',
      instructions: agentInstructions,
      mcpServers: [mcpServer],
      model: new OpenAIChatCompletionsModel(
        client as any, // AzureOpenAI is compatible with OpenAI for our purposes
        AZURE_OPENAI_DEPLOYMENT!
      ),
    });

    console.log('✅ Agent initialized successfully');
    return agent;

  } catch (error) {
    console.error('❌ Failed to initialize agent:', error);
    throw error;
  }
}

/**
 * Express server setup
 */
async function startServer() {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());

  // Initialize agent
  const agent = await createAgent();

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      // Verify Azure OpenAI configuration
      const client = createOpenAIClient();
      const hasToken = USE_AZURE_IDENTITY ? false : true; // Will be checked during actual call

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        azureOpenAI: {
          endpoint: AZURE_OPENAI_ENDPOINT,
          deployment: AZURE_OPENAI_DEPLOYMENT,
          useIdentity: USE_AZURE_IDENTITY,
          hasToken
        },
        mcpServerUrl: MCP_SERVER_URL
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Chat endpoint
  app.post('/chat', async (req, res) => {
    try {
      const { message, sessionId = 'default', stream = false } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required and must be a string' });
      }

      console.log(`🔍 Debug [${sessionId}]: Processing message "${message}"`);

      // Get conversation history
      const history = getConversationHistory(sessionId);
      console.log(`📚 History [${sessionId}]: ${history.length} messages in conversation`);

      // Add user message to history
      const newHistory = [...history, { role: 'user' as const, content: message }];

      console.log(`👤 User [${sessionId}]: ${message}`);

      // Run the agent with conversation history
      const result = await run(agent, newHistory);

      // Update conversation history with the full result
      updateConversationHistory(sessionId, result.history);
      console.log(`💾 Updated [${sessionId}]: Now has ${result.history.length} messages`);

      const response = result.finalOutput || 'I apologize, but I was unable to generate a response.';
      
      console.log(`🤖 Agent [${sessionId}]: ${response}`);

      res.json({
        response,
        sessionId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Admin tools endpoint for debugging
  app.get('/admin/tools', async (req, res) => {
    try {
      // This would normally be done through the agent, but for debugging we can check directly
      res.json({
        message: 'Use the chat endpoint to interact with MCP tools through the agent',
        availableEndpoints: [
          '/health - Health check',
          '/chat - Chat with agent',
          '/admin/tools - This endpoint'
        ]
      });
    } catch (error) {
      console.error('Tools error:', error);
      res.status(500).json({
        error: 'Failed to retrieve tools',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Start server
  app.listen(PORT, () => {
    console.log('🚀 Hackathon Agent Service');
    console.log(`   • Server: http://localhost:${PORT}`);
    console.log(`   • Health: http://localhost:${PORT}/health`);
    console.log(`   • Chat: POST http://localhost:${PORT}/chat`);
    console.log('');
    console.log('💡 Example chat request:');
    console.log(`   curl -X POST http://localhost:${PORT}/chat \\`);
    console.log(`        -H "Content-Type: application/json" \\`);
    console.log(`        -d '{"message": "I want to submit a hackathon idea"}'`);
    console.log('');
  });
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer().catch(console.error);
