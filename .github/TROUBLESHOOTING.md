# Troubleshooting Guide

## Azure Table Storage with Azurite

### Issue: 400/403 Errors with Azure Table Storage SDK

**Symptoms:**
- Azure Functions logs show 400 or 403 errors when calling Azure Table Storage
- Azurite logs show: `"POST /users HTTP/1.1" 400 -` or similar
- Error messages about "AuthorizationFailure"

**Root Cause:**
The Azure Table Storage SDK requires a specific connection string format for Azurite. Common formats like `"UseDevelopmentStorage=true"` or incomplete connection strings cause authentication failures.

**Solution:**
Use the complete connection string format in `local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "custom",
    "AzureWebJobsStorage": "AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;DefaultEndpointsProtocol=http;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;"
  }
}
```

**Key Requirements:**
1. Must include all endpoint URLs (Blob, Queue, Table)
2. Must include `/devstoreaccount1` in each endpoint
3. Must use the exact Azurite account key
4. Must specify `DefaultEndpointsProtocol=http`

### Azure SDK Implementation Best Practices

**Entity Interfaces:**
```typescript
// ✅ Correct - Plain object with required keys
interface User {
  partitionKey: string;
  rowKey: string;
  email: string;
  name: string;
  createdAt: string;
}

// ❌ Incorrect - Don't extend TableEntity
interface User extends TableEntity {
  email: string;
  name: string;
  createdAt: string;
}
```

**Query Filters:**
```typescript
// ✅ Correct - Use odata helper
const entities = client.listEntities<User>({
  queryOptions: { filter: odata`PartitionKey eq ${encodedEmail}` }
});

// ❌ Incorrect - Raw string (can cause injection issues)
const entities = client.listEntities({
  queryOptions: { filter: `PartitionKey eq '${encodedEmail}'` }
});
```

**Client Creation:**
```typescript
// ✅ Correct - Include allowInsecureConnection for Azurite
const client = TableClient.fromConnectionString(connectionString, tableName, {
  allowInsecureConnection: true
});

// ❌ Incorrect - Missing allowInsecureConnection
const client = TableClient.fromConnectionString(connectionString, tableName);
```

## MCP Server Issues

### Issue: CORS Errors in Browser

**Solution:**
Ensure proper CORS headers in the MCP server transport:

```typescript
const transport = new StreamableHTTPServerTransport({
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
});
```

### Issue: Invalid URL Errors

**Solution:**
Use dynamic port allocation and proper URL construction in Azure Functions:

```javascript
const port = process.env.PORT || Math.floor(Math.random() * 10000) + 50000;
const mcpEndpoint = `http://localhost:${port}/mcp`;
```

## Development Workflow

### Setup Checklist
1. ✅ Start Azurite: `npx azurite --location ~/azurite-data`
2. ✅ Verify connection string in `local.settings.json`
3. ✅ Create tables manually in Azurite (users, sessions, submissions, votes)
4. ✅ Build project: `npm run build`
5. ✅ Start functions: `func start`
6. ✅ Test with MCP Inspector: `npx @modelcontextprotocol/inspector`

### Successful Test Output
When `create_user` tool works correctly, you should see:
```json
{
  "email": "user@example.com",
  "name": "User Name",
  "createdAt": "2025-08-16T05:29:18.013Z"
}
```

### Common Debugging Commands
```bash
# Check Azurite process
ps aux | grep azurite

# Check port usage
lsof -i :10002

# Test direct Azurite connectivity (will show auth error but confirms service is up)
curl -i http://127.0.0.1:10002/devstoreaccount1/Tables

# Check Azure Functions logs
func start --verbose
```
