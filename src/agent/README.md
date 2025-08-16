# Hackathon Agent Service

OpenAI Agent SDK service that provides a conversational interface for hackathon submissions using MCP (Model Context Protocol) tools.

## Overview

This agent service connects to a remote MCP server (the Azure Functions hackathon MCP server) and provides a natural language interface for:

- Creating hackathon submissions
- Viewing submissions in sessions
- Voting on submissions
- Managing user sessions

The agent follows the behavior defined in `.github/agent_prompt.md` and uses the MCP tools exposed by the hackathon submission system.

## Architecture

```
User ↔ Agent Service (OpenAI SDK) ↔ MCP Server (Azure Functions) ↔ Azure Table Storage
```

- **Agent Service**: This service using `@openai/agents` SDK
- **MCP Server**: Remote server at `http://localhost:7071/mcp` (or configured URL)
- **MCP Tools**: 8 tools for managing users, sessions, submissions, and votes

## Setup

### Prerequisites

- Node.js 18+
- Running MCP server (see parent directory instructions)
- OpenAI API key (configured in OpenAI Agent SDK)

### Installation

```bash
cd agent
npm install
```

### Configuration

Set environment variables:

```bash
# MCP server URL (default: http://localhost:7071/mcp)
export MCP_SERVER_URL=http://localhost:7071/mcp

# Port for agent service (default: 3000)
export PORT=3000

# OpenAI API key (required by OpenAI Agent SDK)
export OPENAI_API_KEY=your_openai_api_key
```

## Usage

### Start the Agent Service

```bash
# Development mode with auto-reload
npm run dev

# Build and run production
npm run build
npm start
```

The service will start on port 3000 (or configured PORT) and connect to the MCP server.

### API Endpoints

#### Health Check
```bash
GET /health
```

#### Chat with Agent
```bash
POST /chat
Content-Type: application/json

{
  "message": "Hello, I want to submit a hackathon idea",
  "stream": false
}
```

Response:
```json
{
  "response": "Hi! I'd be happy to help you submit your hackathon idea. To get started, I'll need a few details...",
  "timestamp": "2025-08-15T10:30:00.000Z"
}
```

#### List Available MCP Tools (Admin)
```bash
GET /admin/tools
```

### Test Client

Use the included test client to interact with the agent:

```bash
# Interactive test conversation
npm run test-client

# Single message test
npm run test-client -- --message "Hello, I want to submit an idea"

# Health check
npm run test-client -- --health

# List available tools
npm run test-client -- --tools
```

## Example Conversations

### Submitting a Hackathon Idea

```
👤 User: I want to submit a hackathon idea
🤖 Agent: Great! I'd be happy to help you submit your hackathon idea. 
         To get started, I'll need a few details. First, what's your name and email?

👤 User: My name is Alice Johnson and my email is alice@example.com
🤖 Agent: Perfect! Now, what's the title of your hackathon idea?

👤 User: AI Learning Platform
🤖 Agent: Excellent title! Could you provide a description of your AI Learning Platform idea?

👤 User: An intelligent platform that personalizes learning experiences for students
🤖 Agent: That sounds like a fantastic idea! I also need to know which hackathon session 
         this is for. Do you have a session ID, or would you like me to help you find your sessions?

👤 User: Use session hackathon-aug-2025
🤖 Agent: Perfect! Let me confirm your submission:
         - Name: Alice Johnson
         - Email: alice@example.com
         - Session: hackathon-aug-2025
         - Title: AI Learning Platform
         - Description: An intelligent platform that personalizes learning experiences for students
         
         Does this look correct? Should I submit it?

👤 User: Yes, submit it
🤖 Agent: ✅ Great! Your hackathon idea has been successfully submitted! 
         Would you like to see other submissions in this session or explore voting options?
```

### Viewing Submissions

```
👤 User: Show me other submissions in hackathon-aug-2025
🤖 Agent: Here are the current submissions in the hackathon-aug-2025 session:
         [Lists submissions with titles, authors, and descriptions]
```

### Voting on Submissions

```
👤 User: I want to vote on submissions
🤖 Agent: I'll show you the submissions first, then you can vote:
         [Shows submissions]
         Which submission would you like to vote on? You can vote with "like" or "dislike".
```

## Integration with MCP Server

The agent connects to the MCP server using `MCPServerStreamableHttp` and automatically discovers available tools:

- `list_users`
- `create_user`
- `get_user_sessions`
- `save_submission`
- `list_submissions`
- `list_all_submissions` (admin)
- `save_vote`
- `list_votes`

The agent uses these tools to fulfill user requests according to the conversational flow defined in the agent prompt.

## Development

### File Structure

```
agent/
├── src/
│   ├── index.ts         # Main agent service
│   └── test-client.ts   # Test client for the service
├── package.json
├── tsconfig.json
└── README.md
```

### Key Components

- **HackathonAgent**: Main class that wraps OpenAI Agent SDK and MCP server connection
- **Express Server**: REST API endpoints for chat and admin functions
- **Test Client**: Utilities for testing the agent service

### Adding New Features

1. Update the agent instructions in `src/index.ts`
2. Add new API endpoints as needed
3. Test with the test client
4. Update this README

## Deployment

The agent service can be deployed alongside or separately from the MCP server:

### Option 1: Local Development
- Run MCP server on port 7071
- Run agent service on port 3000

### Option 2: Azure Deployment
- Deploy MCP server as Azure Functions
- Deploy agent service as Azure Container Instances or App Service
- Update `MCP_SERVER_URL` to point to deployed Functions endpoint

### Option 3: Combined Deployment
- Add agent service to the same Azure Functions app
- Use internal communication between functions

## Troubleshooting

### Common Issues

1. **MCP Server Connection Failed**
   - Ensure MCP server is running on the configured URL
   - Check that all required Azure Table Storage tables exist
   - Verify Azurite is running for local development

2. **OpenAI API Errors**
   - Verify `OPENAI_API_KEY` is set correctly
   - Check OpenAI API quota and billing status

3. **Agent Not Responding**
   - Check agent service logs for errors
   - Test MCP tools directly using `/admin/tools` endpoint
   - Verify MCP server is responding correctly

### Debug Mode

Enable debug logging:

```bash
DEBUG=* npm run dev
```

This will show detailed logs from the OpenAI Agent SDK and MCP communication.

## License

MIT
