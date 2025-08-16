# Copilot Instructions for this Repo

This repository contains a minimal MCP server (Azure Functions) and an agent service for a hackathon submissions assistant.

Primary guidance for Copilot Chat and other agents:
- Core agent spec: .github/agent_spec.md
- Agent behavior/prompt: .github/agent_prompt.md
- MCP tools schema: .github/mcp/tools.schema.json

When asking Copilot Chat for help, reference "agent spec" or "agent prompt," and it should use these workspace docs automatically. If not, say: "Use workspace docs."

## Key Architecture
- The agent collects Name, Email, Idea title, Idea description.
- It saves via the MCP tool `save_submission` and lists via `list_submissions`.
- Data lives in **Azure Table Storage** (local: Azurite emulator), deployed as Azure Functions per the spec.
- **8 MCP tools total**: list_users, create_user, get_user_sessions, save_submission, list_submissions, save_vote, list_votes, list_all_submissions (admin)
- **OpenAI Agent Service**: src/agent/ directory contains conversational interface using @openai/agents SDK
- **REST API**: Agent service exposes /chat, /health, /admin/tools endpoints
- **Test Infrastructure**: Comprehensive test suites for both MCP server and agent service
- **Session management**: Sessions are created implicitly when saving submissions (not explicitly)

## Critical Azure Table Storage Implementation Notes

### Working Connection String Format for Azurite
The connection string in `local.settings.json` must be in this exact format:
```json
"AzureWebJobsStorage": "AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;DefaultEndpointsProtocol=http;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;"
```

**NOT** the typical "UseDevelopmentStorage=true" or other formats.

### Azure Table Storage SDK Best Practices
1. **Entity Structure**: Use plain objects with `partitionKey` and `rowKey`, not extending `TableEntity`
2. **Query Filters**: Always use the `odata` helper function for queries
3. **Email Encoding**: Replace `@` with `_at_` and `.` with `_dot_` for partition/row keys
4. **Type Safety**: Use generic types like `client.listEntities<EntityType>()`
5. **Connection Options**: Always include `allowInsecureConnection: true` for local Azurite

### Example Working Implementation
```typescript
import { TableClient, odata } from "@azure/data-tables";

// Plain entity interface
interface User {
  partitionKey: string;
  rowKey: string;
  email: string;
  name: string;
  createdAt: string;
}

// Create client with proper connection
const client = TableClient.fromConnectionString(connectionString, tableName, {
  allowInsecureConnection: true
});

// Query with odata helper
const entities = client.listEntities<User>({
  queryOptions: { filter: odata`PartitionKey eq ${encodedEmail}` }
});
```uctions for this Repo

This repository contains a minimal MCP server (Azure Functions) and an agent spec for a hackathon submissions assistant.

Primary guidance for Copilot Chat and other agents:
- Core agent spec: .github/agent_spec.md
- Agent behavior/prompt: .github/agent_prompt.md
- MCP tools schema: .github/mcp/tools.schema.json

When asking Copilot Chat for help, reference “agent spec” or “agent prompt,” and it should use these workspace docs automatically. If not, say: “Use workspace docs.”

## Key Architecture
- The agent collects Name, Email, Idea title, Idea description.
- It saves via the MCP tool `save_submission` and lists via `list_submissions`.
- Data lives in **Azure Table Storage** (local: Azurite emulator), deployed as Azure Functions per the spec.
- **8 MCP tools total**: list_users, create_user, get_user_sessions, save_submission, list_submissions, save_vote, list_votes, list_all_submissions (admin)
- **OpenAI Agent Service**: agent/ directory contains conversational interface using @openai/agents SDK
- **REST API**: Agent service exposes /chat, /health, /admin/tools endpoints
- **Test Infrastructure**: Comprehensive test suites for both MCP server and agent service
- **Session management**: Sessions are created implicitly when saving submissions (not explicitly)

## Critical Azure Table Storage Implementation Notes

### Working Connection String Format for Azurite
The connection string in `local.settings.json` must be in this exact format:
```json
"AzureWebJobsStorage": "AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;DefaultEndpointsProtocol=http;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;"
```

**NOT** the typical "UseDevelopmentStorage=true" or other formats.

### Azure Table Storage SDK Best Practices
1. **Entity Structure**: Use plain objects with `partitionKey` and `rowKey`, not extending `TableEntity`
2. **Query Filters**: Always use the `odata` helper function for queries
3. **Email Encoding**: Replace `@` with `_at_` and `.` with `_dot_` for partition/row keys
4. **Type Safety**: Use generic types like `client.listEntities<EntityType>()`
5. **Connection Options**: Always include `allowInsecureConnection: true` for local Azurite

### Example Working Implementation
```typescript
import { TableClient, odata } from "@azure/data-tables";

// Plain entity interface
interface User {
  partitionKey: string;
  rowKey: string;
  email: string;
  name: string;
  createdAt: string;
}

// Create client with proper connection
const client = TableClient.fromConnectionString(connectionString, tableName, {
  allowInsecureConnection: true
});

// Query with odata helper
const entities = client.listEntities<User>({
  queryOptions: { filter: odata`PartitionKey eq ${encodedEmail}` }
});
```

### Comprehensive Testing
- **Test Suite**: `test-mcp-client.js` uses MCP Client SDK to test all 8 tools
- **MCP Inspector**: Connect to `http://localhost:7071/mcp` for manual testing
- **End-to-end Flow**: User creation → Session creation → Submission saving → Voting
- **Azure Storage**: All CRUD operations validated with proper connection string format

## Azure OpenAI Integration with Entra Identity

### OpenAI Agents SDK with Azure OpenAI Configuration

The agent service (`src/agent/`) uses the @openai/agents SDK with Azure OpenAI and Entra identity authentication. This provides secure, token-based access without API keys.

### Working Configuration Pattern

```typescript
import { Agent, OpenAIChatCompletionsModel } from '@openai/agents';
import { DefaultAzureCredential } from '@azure/identity';
import { AzureOpenAI } from 'openai';

// Environment Configuration (.env)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4.1-mini
AZURE_OPENAI_API_VERSION=2024-02-01
USE_AZURE_IDENTITY=true
MCP_SERVER_URL=http://127.0.0.1:7071/mcp  // Use IPv4, not localhost

// Proper Azure OpenAI Client Setup
const credential = new DefaultAzureCredential();
const client = new AzureOpenAI({
  endpoint: AZURE_OPENAI_ENDPOINT,
  azureADTokenProvider: async () => {
    const token = await credential.getToken('https://cognitiveservices.azure.com/.default');
    return token.token;
  },
  apiVersion: AZURE_OPENAI_API_VERSION,
  deployment: AZURE_OPENAI_DEPLOYMENT,
});

// Agent with Azure OpenAI Model
const agent = new Agent({
  name: 'Hackathon Coordinator',
  instructions: agentInstructions,
  mcpServers: [mcpServer],
  model: new OpenAIChatCompletionsModel(
    client,
    AZURE_OPENAI_DEPLOYMENT
  ),
});
```

### Critical Implementation Notes

1. **Token Provider**: Use `azureADTokenProvider` for automatic token refresh, not static `apiKey`
2. **Correct Client**: Import and use `AzureOpenAI` from 'openai', not the generic `OpenAI` class
3. **Model Configuration**: `new OpenAIChatCompletionsModel(client, deploymentName)` - client first, then deployment name
4. **Endpoint Format**: Must use `.openai.azure.com` domain, not `.cognitiveservices.azure.com`
5. **IPv4 Connection**: Use `127.0.0.1:7071` for MCP server, not `localhost:7071` to avoid IPv6 issues
6. **Authentication Scope**: Token scope must be `'https://cognitiveservices.azure.com/.default'`
7. **ES Module Support**: Full ES module configuration with proper __dirname handling

### Deployment Discovery

```bash
# Find resource group
az resource list --name your-ai-services-resource --query "[0].resourceGroup" -o tsv

# List deployments
az cognitiveservices account deployment list --name your-resource --resource-group your-rg
```

### Common Issues and Solutions

- **404 Resource not found**: Verify deployment name matches exactly, use correct `.openai.azure.com` endpoint
- **401 Authentication**: Use `azureADTokenProvider` with token refresh, not static token
- **Connection refused**: Use IPv4 address `127.0.0.1` instead of `localhost` for MCP server
- **Invalid syntax**: Import `OpenAIChatCompletionsModel` and use `new OpenAIChatCompletionsModel(client, deployment)`
- **ES Module errors**: Use `node --loader tsx/esm` for TypeScript execution, configure "type": "module" in package.json

## Azure OpenAI Integration with Entra Identity

### OpenAI Agents SDK with Azure OpenAI Configuration

The agent service (`agent/`) uses the @openai/agents SDK with Azure OpenAI and Entra identity authentication. This provides secure, token-based access without API keys.

### Working Configuration Pattern

```typescript
import { Agent, OpenAIChatCompletionsModel } from '@openai/agents';
import { DefaultAzureCredential } from '@azure/identity';
import { AzureOpenAI } from 'openai';

// Environment Configuration (.env)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4.1-mini
AZURE_OPENAI_API_VERSION=2024-02-01
USE_AZURE_IDENTITY=true
MCP_SERVER_URL=http://127.0.0.1:7071/mcp  // Use IPv4, not localhost

// Proper Azure OpenAI Client Setup
const credential = new DefaultAzureCredential();
const client = new AzureOpenAI({
  endpoint: AZURE_OPENAI_ENDPOINT,
  azureADTokenProvider: async () => {
    const token = await credential.getToken('https://cognitiveservices.azure.com/.default');
    return token.token;
  },
  apiVersion: AZURE_OPENAI_API_VERSION,
  deployment: AZURE_OPENAI_DEPLOYMENT,
});

// Agent with Azure OpenAI Model
const agent = new Agent({
  name: 'Hackathon Coordinator',
  instructions: agentInstructions,
  mcpServers: [mcpServer],
  model: new OpenAIChatCompletionsModel(
    client,
    AZURE_OPENAI_DEPLOYMENT
  ),
});
```

### Critical Implementation Notes

1. **Token Provider**: Use `azureADTokenProvider` for automatic token refresh, not static `apiKey`
2. **Correct Client**: Import and use `AzureOpenAI` from 'openai', not the generic `OpenAI` class
3. **Model Configuration**: `new OpenAIChatCompletionsModel(client, deploymentName)` - client first, then deployment name
4. **Endpoint Format**: Must use `.openai.azure.com` domain, not `.cognitiveservices.azure.com`
5. **IPv4 Connection**: Use `127.0.0.1:7071` for MCP server, not `localhost:7071` to avoid IPv6 issues
6. **Authentication Scope**: Token scope must be `'https://cognitiveservices.azure.com/.default'`

### Deployment Discovery

```bash
# Find resource group
az resource list --name your-ai-services-resource --query "[0].resourceGroup" -o tsv

# List deployments
az cognitiveservices account deployment list --name your-resource --resource-group your-rg
```

### Common Issues and Solutions

- **404 Resource not found**: Verify deployment name matches exactly, use correct `.openai.azure.com` endpoint
- **401 Authentication**: Use `azureADTokenProvider` with token refresh, not static token
- **Connection refused**: Use IPv4 address `127.0.0.1` instead of `localhost` for MCP server
- **Invalid syntax**: Import `OpenAIChatCompletionsModel` and use `new OpenAIChatCompletionsModel(client, deployment)`
