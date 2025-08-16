<!-- For Copilot Chat & Workspace Docs: This is the primary source of truth for the Hackathon Submission Agent. Read this first, then .github/agent_prompt.md and .github/mcp/tools.schema.json. -->

# Hackathon Submission Agent – Spec (MCP on Azure Functions)

## Overview
A minimal chat agent that collects hackathon submissions and lets users view other entries. The agent gathers four required fields and, on confirmation, saves the submission to a database. It can also list submissions on request.

Required fields
- Name
- Email  
- Idea title
- Idea description

## Architecture (Azure-friendly, MCP-based)
- Agent (OpenAI Agent SDK): Runs the conversation and calls MCP tools exposed by a remote MCP server.
- Agent Service: Uses OpenAI Agent SDK with MCPServerStreamableHttp to connect to MCP server endpoint
  - **Azure OpenAI Integration**: Uses AzureOpenAI client with Entra identity (DefaultAzureCredential)
  - **Model Configuration**: OpenAIChatCompletionsModel with azureADTokenProvider for automatic token refresh
  - **REST API**: Exposes /chat, /health, /admin/tools endpoints on port 3000
- Remote MCP Server: Hosted on Azure Functions using MCP SDK with StreamableHTTPServerTransport
  - Tools provided by the MCP server (8 total):
    - `list_users`: List all registered users
    - `create_user`: Create a new user explicitly (for testing)
    - `get_user_sessions`: Get game sessions for a user
    - `save_submission`: Persist a submission to a game session (auto-creates user and session)
    - `list_submissions`: Retrieve submissions for a session (requires sessionId)
    - `list_all_submissions`: Admin tool to list submissions across all sessions (optional sessionId)
    - `save_vote`: Save or update votes on submissions
    - `list_votes`: Retrieve votes for sessions/submissions
- Data store: Azure Table Storage (via Azure Storage SDK)
  - Tables: users, sessions, submissions, votes
  - PartitionKey/RowKey design per table (see data model section)
  - Email encoding for keys: `@` → `_at_`, `.` → `_dot_`
- Identity & Monitoring: Uses AzureWebJobsStorage connection from Function App; Application Insights enabled.

Notes
- **Session Management**: Sessions are created implicitly when first submission is saved (not explicitly)
- **Connection String**: Must use full endpoint format for Azurite (not "UseDevelopmentStorage=true")
- **Azure OpenAI**: Uses Entra identity authentication, no API keys required
- **Network**: MCP server connection uses IPv4 (127.0.0.1:7071) to avoid IPv6 issues
- **Azure Table Storage**: Uses plain object entities (not extending TableEntity), odata helper for queries
- Use Azurite for local development with manual table creation
- CORS headers configured for MCP Inspector and client access

## MCP tools (contract)
- `list_users`
  - params schema: `{}`
  - result: `{ users: User[] }` where User = `{ email, name, createdAt }`
  - behavior: return all registered users
- `create_user`  
  - params schema: `{ name: string[1..100], email: string }`
  - result: `{ email, name, createdAt }`
  - behavior: explicitly create a user (for testing); returns existing if duplicate
- `get_user_sessions`
  - params schema: `{ userId: string }` (userId = email in our system)
  - result: `{ sessions: GameSession[] }` where GameSession = `{ sessionId, email, name, status, createdAt }`
  - behavior: return all game sessions for a user
- `save_submission`
  - params schema: `{ sessionId: string, name: string[1..100], email: string, title: string[1..120], description: string[1..2000] }`
  - result: `{ id, sessionId, name, email, title, description, createdAt, updatedAt }`
  - behavior: validate inputs, trim strings, lowercase email; **auto-create user and session if needed**; create submission in game session
- `list_submissions`
  - params schema: `{ sessionId: string, email?: string }`
  - result: `{ items: Submission[] }` where Submission = above fields
  - behavior: return submissions for a specific game session (sessionId required), optionally filtered by email
- `list_all_submissions`
  - params schema: `{ sessionId?: string, email?: string }`
  - result: `{ items: Submission[] }` where Submission = above fields
  - behavior: **admin tool** to return submissions across all sessions, optionally filtered by sessionId or email
- `save_vote`
  - params schema: `{ submissionId: string, voterEmail: string, voteType: "like"|"dislike" }`
  - result: `{ id, sessionId, voterEmail, submissionId, voteType, createdAt }`
  - behavior: save or update vote for a submission (simple like/dislike system)
- `list_votes`
  - params schema: `{ sessionId: string, submissionId?: string }`
  - result: `{ votes: Vote[] }` where Vote = above fields
  - behavior: return votes for a session, optionally filtered by submission

**Key Session Management Behavior:**
- Sessions are **implicitly created** when `save_submission` is called with a new sessionId
- Session names are auto-generated as "Session for {submission_title}"
- Use `get_user_sessions(userId)` where userId = email to retrieve user's sessions
- Multiple users can submit to the same sessionId (hackathon event)
- Use `list_submissions(sessionId)` for session-specific listing
- Use `list_all_submissions()` for admin overview across all sessions

A reference JSON schema for all tools is provided in .github/mcp/tools.schema.json.
  - params schema: { sessionId: string, name: string[1..100], email: string, title: string[1..120], description: string[1..2000] }
  - result: { id, sessionId, name, email, title, description, createdAt, updatedAt }
  - behavior: validate inputs, trim strings, lowercase email; create submission in game session
- list_submissions
  - params schema: { sessionId: string, email?: string }
  - result: { items: Submission[] } where Submission = above fields
  - behavior: return submissions for a game session, optionally filtered by email
- save_vote
  - params schema: { sessionId: string, voterEmail: string, submissionId: string, score: number[1..5] }
  - result: { id, sessionId, voterEmail, submissionId, score, createdAt }
  - behavior: save or update vote for a submission
- list_votes
  - params schema: { sessionId: string, submissionId?: string }
  - result: { votes: Vote[] } where Vote = above fields
  - behavior: return votes for a session, optionally filtered by submission

A reference JSON schema for all tools is provided in .github/mcp/tools.schema.json.

## Data model
User
- email: string (lowercased; RFC5322-ish shape) [PK]
- name: string (1..100)
- createdAt: ISO 8601 UTC (server-set)

GameSession
- sessionId: string (UUID) [PK]
- email: string (creator email)
- name: string (1..100)
- status: string (active|completed)
- createdAt: ISO 8601 UTC (server-set)

Submission
- id: string (UUID) [PK]
- sessionId: string
- name: string (1..100)
- email: string (lowercased)
- title: string (1..120)
- description: string (1..2000)
- createdAt: ISO 8601 UTC (server-set)
- updatedAt: ISO 8601 UTC (server-set)

Vote
- id: string (UUID) [PK]
- sessionId: string
- voterEmail: string (lowercased)
- submissionId: string
- voteType: string ("like"|"dislike")
- createdAt: ISO 8601 UTC (server-set)

Storage Tables Design:
- users table: PartitionKey=encodedEmail, RowKey=encodedEmail
- sessions table: PartitionKey=encodedEmail, RowKey=sessionId  
- submissions table: PartitionKey=sessionId, RowKey=submissionId
- votes table: PartitionKey=sessionId, RowKey=voteId

**Email Encoding for Azure Table Storage Keys:**
- Replace `@` with `_at_` and `.` with `_dot_` for partition/row keys
- Example: `alice@example.com` → `alice_at_example_dot_com`

Validation
- Required: name, email, title, description
- Trim all inputs; reject if empty after trim
- Basic email check; lowercase canonicalization

## Implementation sketch (Azure Functions + MCP Server + OpenAI Agent SDK)
- Use Azure Functions (Node.js) with custom handler to host MCP server endpoints
- Use @modelcontextprotocol/sdk with StreamableHTTPServerTransport
- Register eight MCP tools in the server with proper input/output schemas
- Use @azure/data-tables SDK with proper connection string format
- Use @openai/agents SDK to create agent service that connects to MCP server via MCPServerStreamableHttp
- **Azure OpenAI Configuration**: 
  - Import `AzureOpenAI` from 'openai' and `OpenAIChatCompletionsModel` from '@openai/agents'
  - Use `DefaultAzureCredential` with `azureADTokenProvider` for automatic token refresh
  - Model: `new OpenAIChatCompletionsModel(azureClient, deploymentName)`
  - Environment: AZURE_OPENAI_ENDPOINT (.openai.azure.com), AZURE_OPENAI_DEPLOYMENT, USE_AZURE_IDENTITY=true
- Agent implements the prompt behavior from .github/agent_prompt.md to guide hackathon submissions
- Deploy agent service separately or alongside MCP server on Azure
- Agent service provides REST API endpoints (/chat, /health, /admin/tools)
- Test client included for validating agent conversations
  ```json
  "AzureWebJobsStorage": "AccountName=devstoreaccount1;AccountKey=...;DefaultEndpointsProtocol=http;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;"
  ```
- Use plain object entities (not extending TableEntity), odata helper for queries
- Include proper CORS headers for MCP client access
- Log tool invocations and outcomes to App Insights

**Critical Azure Table Storage Implementation Notes:**
- Use full endpoint connection string format (not "UseDevelopmentStorage=true")  
- Include `allowInsecureConnection: true` for local Azurite
- Use `odata` helper function for all queries: `odata\`PartitionKey eq ${encodedEmail}\``
- Encode emails for keys: replace @ and . with safe characters

## Local Development Setup
1. **Start Azurite**: `azurite --silent --location .azurite --debug .azurite/debug.log`
2. **Create Tables Manually** in Azurite: users, sessions, submissions, votes
3. **Configure Connection String** in `local.settings.json` with full endpoint format
4. **Start Functions**: `func start` (runs on port 7071 by default)
5. **Test with MCP Inspector**: `npx @modelcontextprotocol/inspector` → connect to `http://localhost:7071/mcp`

## Edge cases
- **New user**: auto-created when first submission is saved (no explicit user creation needed)
- **Missing session**: auto-created when `save_submission` is called with new sessionId
- **Invalid sessionId**: return appropriate error message
- **Duplicate votes**: treat as upsert (one vote per voter per submission)
- **Email encoding**: handle @ and . characters in Azure Table Storage keys safely
- **Large listings**: return recent subsets to keep responses concise
- **Connection string format**: ensure full endpoint format for Azurite compatibility

## Security & privacy
- Store only required fields; no secrets
- Azure Storage Tables encryption at rest; uses existing AzureWebJobsStorage; minimal RBAC
- Sanitize output when listing; only return stored fields
- CORS configured for expected MCP clients only

## Deployment notes 
- **Local**: Use Azurite with manual table creation and full connection string format
- **Production**: Deploy Function App (consumption or premium) with App Insights
- Uses existing AzureWebJobsStorage from Function App runtime
- Point your MCP-capable client at `https://<function-app>.azurewebsites.net/mcp`
- Test with MCP Inspector: `npx @modelcontextprotocol/inspector`

## Testing & Validation
- **MCP Client SDK Test**: Use `@modelcontextprotocol/sdk` with `StreamableHTTPClientTransport`
- **End-to-end flow**: User creation → Session creation → Submission saving → Voting
- **All 7 tools tested**: list_users, create_user, get_user_sessions, save_submission, list_submissions, save_vote, list_votes
- **Azure Table Storage integration**: Verified with proper connection string and entity patterns

## Requirements coverage
- Collect Name, Email, Idea title, Idea description: covered
- Save to hackathon submission database: covered (MCP tool save_submission -> Azure Storage Tables)
- Allow users to view other submissions: covered (MCP tool list_submissions)
- Support game sessions and voting: covered (session management and voting tools)
- Remind users about 2-hour scope: covered (agent prompt directive)
