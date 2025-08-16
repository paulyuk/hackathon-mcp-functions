# Hackathon MCP Server (Azure Functions)

Remote MCP server exposing 8 tools for a hackathon submission system:
- `list_users` - List all registered users
- `create_user` - Create a new user explicitly (for testing)
- `get_user_sessions` - Get game sessions for a user  
- `save_submission` - Save hackathon submission (auto-creates user/session)
- `list_submissions` - List submissions for a session (requires sessionId)
- `save_vote` - Vote on submissions (like/dislike)
- `list_votes` - List votes for sessions/submissions
- `list_all_submissions` - **Admin tool** - List all submissions across sessions (optional sessionId)

Backed by **Azure Table Storage** via Azure Storage SDK. Designed to pair with the agent prompt/spec in `.github/`.

## Key Features
- **Implicit Session Management**: Sessions auto-created when saving submissions
- **Auto User Creation**: Users created automatically when saving submissions  
- **Simple Voting**: Like/dislike voting system for submissions
- **Admin Tools**: Separate admin tools for cross-session visibility
- **Session Scoping**: User tools maintain proper data isolation with required sessionId
- **Azure Table Storage**: Uses proper entity patterns with email encoding
- **MCP Protocol**: Full MCP SDK compatibility with StreamableHTTPTransport

## Endpoints
- **MCP Server**: `GET/POST http://localhost:7071/mcp` (local) or `https://<function-app>.azurewebsites.net/mcp`
- **Tool Discovery**: Connect with MCP Inspector at above endpoint

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
node tests/test-mcp-client.js
```

This tests all 8 tools end-to-end including:
- User creation and listing  
- Session management (implicit creation)
- Submission saving and listing
- Voting functionality
- Admin tools for cross-session visibility

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

## Copilot Chat Setup

Workspace docs config lives in `.github/` for Copilot Chat integration:
- `.github/agent_spec.md` - Complete system specification
- `.github/agent_prompt.md` - Agent behavior guidance  
- `.github/mcp/tools.schema.json` - Tool schemas reference
- `.github/copilot-instructions.md` - Copilot-specific guidance

If Copilot Chat misses context, type: **"Use workspace docs"**.
