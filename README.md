# Hackathon MCP Server (### Quick Testing

1. **Start Azurite** (Terminal 1):
   ```bash
   azurite-table --tableHost 127.0.0.1 --tablePort 10002
   ```

2. **Start MCP Server** (Terminal 2):
   ```bash
   npm run dev
   # Server runs on http://localhost:7071
   ```

3. **Test MCP Tools** (Terminal 3):
   ```bash
   npm run test
   # Tests all 8 MCP tools with proper data validation
   ```

4. **Start Agent Service** (Terminal 4):
   ```bash
   npm run agent-dev
   # Agent runs on http://localhost:3000
   ```

5. **Chat with Agent** (Terminal 5):
   ```bash
   npm run chat
   # Interactive conversation with hackathon agent
   ```

### Available Commands

**Testing & Development:**
- `npm run test` - Test MCP server directly (all 8 tools)
- `npm run test-agent` - Test agent conversation flow in src/agent directory
- `npm run test-all` - Run both MCP and agent tests
- `npm run agent-dev` - Start agent service in development mode
- `npm run dev` - Start MCP server (Azure Functions)

**Chat Interface:**
- `npm run chat` - **Interactive chat with the agent** (real-time conversation)
- `npm run chat-demo` - Run automated demo conversation
- `npm run chat-message` - Send single message to agent  
- `npm run chat-health` - Quick health check

**Setup:**
- `npm run agent-install` - Install agent dependencies
- `npm run agent-build` - Build agent TypeScript codens) + Agent Service

Remote MCP server exposing 8 tools for a hackathon submission system, plus an OpenAI Agent SDK service with Azure OpenAI and Entra identity authentication that provides a conversational interface.

## Components

### 1. MCP Server (Azure Functions)
- `list_users` - List all registered users
- `create_user` - Create a new user explicitly (for testing)
- `get_user_sessions` - Get game sessions for a user  
- `save_submission` - Save hackathon submission (auto-creates user/session)
- `list_submissions` - List submissions for a session (requires sessionId)
- `save_vote` - Vote on submissions (like/dislike)
- `list_votes` - List votes for sessions/submissions
- `list_all_submissions` - **Admin tool** - List all submissions across sessions (optional sessionId)

### 2. Agent Service (OpenAI SDK + Azure OpenAI)
- Conversational interface using OpenAI Agent SDK with Azure OpenAI
- Azure Entra identity authentication (no API keys required)
- Connects to MCP server via `MCPServerStreamableHttp`
- Implements agent behavior from `.github/agent_prompt.md`
- Guides users through hackathon submission process
- REST API endpoints for chat and administration

## Quick Start

### 1. Start MCP Server
```bash
# Install dependencies
npm install

# Start Azurite (in separate terminal)
azurite --silent --location .azurite --debug .azurite/debug.log

# Start Functions (requires tables to be created manually)
func start
```

### 2. Configure Azure OpenAI
```bash
# Authenticate with Azure (required for Entra identity)
az login

# Create .env file in src/agent/
cp src/agent/.env.example src/agent/.env

# Edit .env with your Azure OpenAI details:
# AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
# AZURE_OPENAI_DEPLOYMENT=gpt-4.1-mini
# AZURE_OPENAI_API_VERSION=2024-08-01-preview
# USE_AZURE_IDENTITY=true
# MCP_SERVER_URL=http://127.0.0.1:7071/mcp
```

### 3. Start Agent Service
```bash
# Install dependencies and start service
npm run agent-install
npm run agent-dev
```

### 4. Chat with the Agent 💬
Once both services are running, you can chat with the agent using these simple commands:

```bash
# Interactive chat session (recommended) - Runs a full demo conversation
npm run chat

# Send a single message
npm run chat-message "Hello, I want to submit a hackathon idea"

# Check agent health and Azure OpenAI configuration
npm run chat-health
```

The interactive chat (`npm run chat`) demonstrates the complete flow:
- ✅ Azure OpenAI authentication verification
- ✅ MCP tools availability check
- ✅ Natural conversation for hackathon submissions
- ✅ User creation, idea submission, and voting workflow

## Testing Strategy

### Two-Layer Testing Approach

#### 1. **MCP Server Direct Testing** (`npm run test`)
- **File**: `/tests/test-mcp-client.js`
- **Purpose**: Tests the 8 MCP tools directly using MCP Client SDK
- **Target**: `http://127.0.0.1:7071/mcp` (Azure Functions)
- **Tests**: Raw tool functionality, data flow, Azure Table Storage

```bash
npm run test
```

**What it validates:**
- ✅ `list_users` - User management
- ✅ `save_submission` - Creates users/sessions implicitly  
- ✅ `get_user_sessions` - Session retrieval
- ✅ `list_submissions` - Session-scoped submissions
- ✅ `save_vote`/`list_votes` - Voting system
- ✅ `list_all_submissions` - Admin cross-session view
- ✅ `create_user` - Explicit user creation

#### 2. **Agent Service End-to-End Testing** (`npm run test-agent`)
- **File**: `/tests/test-agent-client.ts`
- **Purpose**: Tests conversational interface with Azure OpenAI integration
- **Target**: `http://localhost:3000` (Agent Service REST API)
- **Tests**: Full user experience, natural language → MCP tools

```bash
npm run test-agent
```

**What it validates:**
- ✅ Health check and tool availability
- ✅ Azure OpenAI + Entra identity authentication
- ✅ Conversational flow per `.github/agent_prompt.md`
- ✅ Natural language → MCP tool translation
- ✅ Complete user journey (submission creation, voting, etc.)

#### 3. **Complete System Validation**
```bash
# Test both layers
npm run test-all

# Test individual endpoints
curl http://localhost:3000/health
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d '{"message": "Hello!"}'

# Validate setup
npm run validate
```

### When to Use Which Test

| Scenario | Use | Reason |
|----------|-----|---------|
| Added new MCP tool | `npm run test` | Direct tool validation |
| Modified agent prompt | `npm run test-agent` | Conversation flow testing |
| Debugging storage issues | `npm run test` | Raw data layer access |
| Testing user experience | `npm run test-agent` | End-to-end flow |
| Azure OpenAI changes | `npm run test-agent` | Authentication/model testing |
| Complete validation | `npm run test-all` | Both layers |

## Architecture
```
User ↔ Agent Service (OpenAI SDK + Azure OpenAI) ↔ MCP Server (Azure Functions) ↔ Azure Table Storage
      REST API                  HTTP MCP Protocol              Azure SDK
      
Test Flow:
test-agent-client.ts → Agent (port 3000) → MCP (port 7071) → Storage
test-mcp-client.js   → ──────────────────── MCP (port 7071) → Storage
```

## Key Features
- **Azure OpenAI Integration**: Uses Azure OpenAI with Entra identity authentication
- **ES Module Support**: Full ES module configuration for modern TypeScript/Node.js
- **Implicit Session Management**: Sessions auto-created when saving submissions
- **Auto User Creation**: Users created automatically when saving submissions  
- **Simple Voting**: Like/dislike voting system for submissions
- **Admin Tools**: Separate admin tools for cross-session visibility
- **Session Scoping**: User tools maintain proper data isolation with required sessionId
- **Azure Table Storage**: Uses proper entity patterns with email encoding
- **MCP Protocol**: Full MCP SDK compatibility with StreamableHTTPTransport
- **Conversational Agent**: OpenAI Agent SDK provides natural language interface
- **RESTful API**: Agent service exposes REST endpoints for integration

## Project Structure
```
/
├── src/
│   ├── agent/                          # OpenAI Agent SDK service
│   │   ├── src/index.ts               # Main agent service (ES modules)
│   │   ├── package.json               # Agent dependencies
│   │   ├── tsconfig.json              # TypeScript config (ESNext)
│   │   ├── .env.example               # Azure OpenAI configuration template
│   │   └── .env                       # Local Azure OpenAI config (gitignored)
│   ├── mcp/                           # MCP server tools
│   │   └── tools.js                   # 8 MCP tool implementations
│   ├── shared/                        # Shared utilities
│   └── index.ts                       # Azure Functions entry points
├── tests/
│   ├── test-mcp-client.js            # Direct MCP server testing
│   ├── test-agent-client.ts          # Agent service E2E testing
│   └── validate.js                   # System validation
├── .github/
│   ├── agent_prompt.md               # Agent behavior/instructions
│   ├── agent_spec.md                 # Technical specifications
│   ├── copilot-instructions.md       # Development guidance
│   └── mcp/tools.schema.json         # MCP tools schema
├── infra/                            # Azure deployment infrastructure
├── package.json                      # Root project (ES modules)
├── host.json                         # Azure Functions configuration
├── local.settings.json               # Local Azure Functions settings
└── azure.yaml                        # Azure Developer CLI configuration
```

## Endpoints & Services

### MCP Server (Azure Functions)
- **Local**: `http://localhost:7071/mcp`
- **Production**: `https://<function-app>.azurewebsites.net/mcp`
- **Protocol**: HTTP with MCP SDK transport
- **Tools**: 8 MCP tools for hackathon submissions

### Agent Service (OpenAI SDK)
- **Local**: `http://localhost:3000`
- **Health**: `GET /health` - Service status and configuration
- **Chat**: `POST /chat` - Conversational interface
- **Admin**: `GET /admin/tools` - List available MCP tools
- **Auth**: Azure OpenAI with Entra identity

### Development Tools
- **MCP Inspector**: Connect to MCP server endpoint for manual testing
- **Azurite**: Local Azure Storage emulator on ports 10000-10002

## Local Development

### Prerequisites
- Node.js 18+
- Azure Functions Core Tools v4
- Azurite (Azure Storage Emulator)

### Setup Steps
1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start Azurite** (in separate terminal):
   ```bash
   azurite --silent --location .azurite --debug .azurite/debug.log
   ```

3. **Create tables manually** in Azurite:
   - Open Azure Storage Explorer or use Azure CLI
   - Create tables: `users`, `sessions`, `submissions`, `votes`

4. **Configure local.settings.json** with correct connection string format:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;DefaultEndpointsProtocol=http;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;",
       "FUNCTIONS_WORKER_RUNTIME": "node"
     }
   }
   ```

5. **Start Functions**:
   ```bash
   func start
   ```

6. **Test with MCP Inspector**:
   ```bash
   npx @modelcontextprotocol/inspector
   ```
   Connect to: `http://localhost:7071/mcp`

### Critical Configuration Notes
- ⚠️ **Connection String Format**: Must use full endpoint format (not "UseDevelopmentStorage=true")
- ⚠️ **Manual Table Creation**: Azurite requires manual table creation 
- ⚠️ **Email Encoding**: @ and . characters are encoded for Azure Table Storage keys

## Testing

### Automated Test Suite
Run comprehensive tests with the MCP Client SDK:
```bash
npm run test
```

This tests all 8 tools end-to-end including:
- User creation and listing  
- Session management (implicit creation)
- Submission saving and listing
- Voting functionality
- Admin tools for cross-session visibility

### Agent Service Tests
Test the conversational agent:
```bash
npm run test-agent
```

### All Tests
Run both MCP and agent tests:
```bash
npm run test-all
```

### Manual Testing with MCP Inspector
1. Start the Functions host: `func start`
2. Open MCP Inspector: `npx @modelcontextprotocol/inspector`  
3. Connect to: `http://localhost:7071/mcp`
4. Test individual tools with sample data

### Sample Tool Calls

**Save a submission** (auto-creates user and session):
```json
{
  "tool": "save_submission",
  "arguments": {
    "sessionId": "hackathon-aug-2025",
    "name": "Alice Johnson", 
    "email": "alice@example.com",
    "title": "AI Learning Platform",
    "description": "An intelligent platform for personalized learning"
  }
}
```

**Get user sessions**:
```json
{
  "tool": "get_user_sessions",
  "arguments": {
    "userId": "alice@example.com"
  }
}
```

**Vote on submission**:
```json
{
  "tool": "save_vote", 
  "arguments": {
    "submissionId": "uuid-from-submission",
    "voterEmail": "judge@example.com",
    "voteType": "like"
  }
}
```

**List all submissions (admin)**:
```json
{
  "tool": "list_all_submissions",
  "arguments": {}
}
```

## Deployment

### Azure Deployment
1. **Provision Azure resources** (Function App, Storage, App Insights)
2. **Deploy function code** via VS Code Azure Functions extension or Azure CLI
3. **Configure connection strings** in Function App settings
4. **Test MCP endpoint**: `https://<function-app>.azurewebsites.net/mcp`

### Bicep Infrastructure
Infrastructure templates provided in `infra/` directory for automated provisioning.

## Troubleshooting

### Common Issues
- **400/403 errors from Azurite**: Check connection string format in `local.settings.json`
- **"Invalid URL" errors**: Ensure using full endpoint connection string (not "UseDevelopmentStorage=true")
- **Tool schema mismatches**: Verify `src/mcp/tools.js` matches `src/server.ts` parameter validation
- **Missing tables**: Create tables manually in Azurite before first run

### Azure Table Storage Best Practices
- Use plain object entities (not extending TableEntity)
- Use `odata` helper for all queries: `odata\`PartitionKey eq ${value}\``
- Include `allowInsecureConnection: true` for local Azurite
- Encode emails for partition/row keys: @ → _at_, . → _dot_

## Architecture

### Data Model
- **Users**: `PartitionKey=encodedEmail, RowKey=encodedEmail`
- **Sessions**: `PartitionKey=encodedEmail, RowKey=sessionId` 
- **Submissions**: `PartitionKey=sessionId, RowKey=submissionId`
- **Votes**: `PartitionKey=sessionId, RowKey=voteId`

### Session Management
- Sessions are **implicitly created** when saving submissions
- Session names auto-generated as "Session for {submission_title}"
- Multiple users can submit to the same sessionId (hackathon event)
- Use `get_user_sessions(userId)` where userId = email
- **Admin Tools**: `list_all_submissions` provides cross-session visibility without requiring sessionId
- **User Tools**: `list_submissions` requires sessionId for proper data scoping

## Quick Reference

### 🚀 Start Development
```bash
# 1. Start storage emulator
azurite --silent --location .azurite --debug .azurite/debug.log

# 2. Start MCP server  
npm start

# 3. Configure and start agent (separate terminal)
cd src/agent
cp .env.example .env  # Edit with your Azure OpenAI details
npm install
npm run dev
```

### 💬 Chat with Agent (Simple!)
```bash
npm run chat                                    # Interactive conversation
npm run chat-message "I want to submit an idea" # Single message
npm run chat-health                             # Check agent status
```

### 🧪 Testing Commands
```bash
npm run test          # Test MCP server directly
npm run test-agent    # Test agent conversation flow  
npm run test-all      # Test both layers
npm run validate      # System validation
```

### 📁 Key Files
- **`src/agent/src/index.ts`** - Agent service with Azure OpenAI
- **`src/mcp/tools.js`** - 8 MCP tool implementations
- **`tests/test-mcp-client.js`** - Direct MCP testing
- **`tests/test-agent-client.ts`** - Agent E2E testing
- **`.github/agent_prompt.md`** - Agent behavior
- **`IMPLEMENTATION_SUMMARY.md`** - Complete change log

### 🔧 Architecture Summary
```
User → Agent (port 3000) → MCP Server (port 7071) → Azure Storage
     Azure OpenAI        HTTP MCP Protocol       Azure Tables
```

## Copilot Chat Setup

Workspace docs config lives in `.github/` for Copilot Chat integration:
- `.github/agent_spec.md` - Complete system specification
- `.github/agent_prompt.md` - Agent behavior guidance  
- `.github/mcp/tools.schema.json` - Tool schemas reference
- `.github/copilot-instructions.md` - Copilot-specific guidance

If Copilot Chat misses context, type: **"Use workspace docs"**.
