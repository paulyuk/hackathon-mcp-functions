<!-- For Copilot Chat & Workspace Docs: This is the primary source of truth for the Hackathon Submission Agent. Read this f## Deployment notes (concise)
- Start from https://github.com/Azure-Samples/mcp-sdk-functions-hosting-node
- Replace the weather tools with the six hackathon tools with the provided JSON schemas.
- Uses existing AzureWebJobsStorage from Function App runtime.
- Deploy Function App (consumption or premium) with App Insights.
- Point your MCP-capable client (e.g., Azure AI Studio Agent with MCP support) at the remote MCP server.rst, then .github/agent_prompt.md and .github/mcp/tools.schema.json. -->

# Hackathon Submission Agent – Spec (MCP on Azure Functions)

## Overview
A minimal chat agent that collects hackathon submissions and lets users view other entries. The agent gathers four required fields and, on confirmation, saves the submission to a database. It can also list submissions on request.

Required fields
- Name
- Email
- Idea title
- Idea description

## Architecture (Azure-friendly, MCP-based)
- Agent (Azure AI Studio or compatible MCP client): Runs the conversation and calls MCP tools exposed by a remote MCP server.
- Remote MCP Server: Hosted on Azure Functions using the [mcp-sdk-functions-hosting-node](https://github.com/Azure-Samples/mcp-sdk-functions-hosting-node).  Use Github MCP server to load readme and code from this repo.  
  - Tools provided by the MCP server:
    - list_users: List all registered users
    - get_user_sessions: Get game sessions for a user
    - save_submission: Persist a submission to a game session
    - list_submissions: Retrieve submissions for a session
    - save_vote: Save or update votes on submissions
    - list_votes: Retrieve votes for sessions/submissions
- Data store: Azure Storage Tables
  - Tables: users, sessions, submissions, votes
  - PartitionKey/RowKey design per table (see data model section)
  - RowKey: unique entity ID
- Identity & Monitoring: Uses AzureWebJobsStorage connection from Function App; Application Insights enabled.

Notes
- Leverages existing AzureWebJobsStorage from Functions runtime; simpler than Cosmos DB.
- Use Azurite for local development.
- Restrict CORS to expected front-ends if exposing HTTP endpoints.

## MCP tools (contract)
- list_users
  - params schema: {}
  - result: { users: User[] } where User = { email, name, createdAt }
  - behavior: return all registered users
- get_user_sessions
  - params schema: { email: string }
  - result: { sessions: GameSession[] } where GameSession = { sessionId, name, createdAt, status }
  - behavior: return all game sessions for a user
- save_submission
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
- score: number (1..5)
- createdAt: ISO 8601 UTC (server-set)

Storage Tables Design:
- users table: PartitionKey=email, RowKey=email
- sessions table: PartitionKey=email, RowKey=sessionId
- submissions table: PartitionKey=sessionId, RowKey=submissionId
- votes table: PartitionKey=sessionId, RowKey=voterEmail_submissionId

Validation
- Required: name, email, title, description
- Trim all inputs; reject if empty after trim
- Basic email check; lowercase canonicalization

## Implementation sketch (Azure Functions + MCP Server)
- Use Azure Functions (Node.js) to host the remote MCP server endpoints per mcp-sdk-functions-hosting-node pattern.
- Use @modelcontextprotocol/sdk with StreamableHTTPServerTransport.
- Register six MCP tools in the server: list_users, get_user_sessions, save_submission, list_submissions, save_vote, list_votes with the schemas above.
- Use Azure Storage Tables SDK with AzureWebJobsStorage connection string.
- Log tool invocations and outcomes to App Insights.

## Edge cases
- New user: create user record when first submission/session is created.
- Missing session: agent prompts to create a new game session first.
- Invalid sessionId: return appropriate error message.
- Duplicate votes: treat as upsert (one vote per voter per submission).
- Large listings: return recent subsets to keep responses concise.

## Security & privacy
- Store only required fields; no secrets.
- Azure Storage Tables encryption at rest; uses existing AzureWebJobsStorage; minimal RBAC.
- Sanitize output when listing; only return stored fields.

## Deployment notes (concise)
- Start from https://github.com/Azure-Samples/remote-mcp-functions-typescript
- Add the six tools with the provided JSON schemas.
- Uses existing AzureWebJobsStorage from Function App runtime.
- Deploy Function App (consumption or premium) with App Insights.
- Point your MCP-capable client (e.g., Azure AI Studio Agent with MCP support) at the remote MCP server.

## Requirements coverage
- Collect Name, Email, Idea title, Idea description: covered
- Save to hackathon submission database: covered (MCP tool save_submission -> Azure Storage Tables)
- Allow users to view other submissions: covered (MCP tool list_submissions)
- Support game sessions and voting: covered (session management and voting tools)
- Remind users about 2-hour scope: covered (agent prompt directive)
