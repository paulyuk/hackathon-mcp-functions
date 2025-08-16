# Copilot Instructions for this Repo

This repository contains a minimal MCP server (Azure Functions) and an agent spec for a hackathon submissions assistant.

Primary guidance for Copilot Chat and other agents:
- Core agent spec: .github/agent_spec.md
- Agent behavior/prompt: .github/agent_prompt.md
- MCP tools schema: .github/mcp/tools.schema.json

When asking Copilot Chat for help, reference "agent spec" or "agent prompt," and it should use these workspace docs automatically. If not, say: "Use workspace docs."

## Key Architecture
- The agent collects Name, Email, Idea title, Idea description.
- It saves via the MCP tool save_submission and lists via list_submissions.
- Data lives in Azure Table Storage (local: Azurite emulator), deployed as Azure Functions per the spec.

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
- **7 MCP tools total**: list_users, create_user, get_user_sessions, save_submission, list_submissions, save_vote, list_votes
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
- **Test Suite**: `test-mcp-client.js` uses MCP Client SDK to test all 7 tools
- **MCP Inspector**: Connect to `http://localhost:7071/mcp` for manual testing
- **End-to-end Flow**: User creation → Session creation → Submission saving → Voting
- **Azure Storage**: All CRUD operations validated with proper connection string format
