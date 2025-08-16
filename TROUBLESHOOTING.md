# Azure Table Storage MCP Server - Troubleshooting Guide

This guide documents solutions to common issues encountered when developing MCP servers with Azure Table Storage and Azure Functions.

## Critical Connection String Issues

### ❌ Problem: 400/403 Errors from Azurite
**Symptoms:**
- `RestError: The MAC signature found in the HTTP request is not the same as any computed signature`
- 403 Forbidden errors when creating entities
- Connection timeouts to Azurite

**✅ Solution: Use Full Endpoint Connection String Format**

**DON'T use this format:**
```json
{
  "AzureWebJobsStorage": "UseDevelopmentStorage=true"
}
```

**DO use this format:**
```json
{
  "AzureWebJobsStorage": "AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;DefaultEndpointsProtocol=http;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;"
}
```

**Why:** The Azure Data Tables SDK requires explicit endpoint configuration for Azurite authentication.

## Azure Table Storage SDK Best Practices

### ❌ Problem: Invalid Entity Structures
**Symptoms:**
- Type errors when creating entities
- Properties not saving correctly
- Query failures

**✅ Solution: Use Plain Object Entities**

**DON'T extend TableEntity:**
```typescript
class User extends TableEntity {
  email: string;
  name: string;
}
```

**DO use plain objects:**
```typescript
interface User {
  partitionKey: string;
  rowKey: string;
  email: string;
  name: string;
  createdAt: string;
}
```

### ❌ Problem: Query Filter Errors
**Symptoms:**
- `Invalid query filter` errors
- Malformed OData expressions

**✅ Solution: Always Use odata Helper**

**DON'T write raw filter strings:**
```typescript
const entities = client.listEntities({
  queryOptions: { filter: `PartitionKey eq '${email}'` }
});
```

**DO use odata helper:**
```typescript
import { odata } from "@azure/data-tables";

const entities = client.listEntities({
  queryOptions: { filter: odata`PartitionKey eq ${email}` }
});
```

### ❌ Problem: Email Characters in Keys
**Symptoms:**
- Invalid character errors in partition/row keys
- Entities not found when querying by email

**✅ Solution: Encode Emails for Keys**

```typescript
function encodeEmailForKey(email: string): string {
  return email.toLowerCase().replace('@', '_at_').replace(/\./g, '_dot_');
}

// Usage
const partitionKey = encodeEmailForKey('alice@example.com'); 
// Result: 'alice_at_example_dot_com'
```

## MCP Protocol Issues

### ❌ Problem: Tool Schema Mismatches
**Symptoms:**
- Validation errors when calling tools
- "Expected string, received undefined" errors

**✅ Solution: Align Tool Schema with Server Schema**

**Check these files match:**
- `src/mcp/tools.js` - Tool input schemas
- `src/server.ts` - Zod validation schemas

**Example mismatch:**
```javascript
// tools.js says:
{ email: { type: "string" } }

// But server.ts expects:
{ userId: z.string() }
```

### ❌ Problem: MCP Inspector Connection Issues
**Symptoms:**
- Cannot connect to MCP server
- 406 Not Acceptable errors

**✅ Solution: Check CORS and Content-Type Headers**

Ensure your server includes proper CORS headers:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

## Local Development Setup

### ❌ Problem: Tables Not Found
**Symptoms:**
- 404 ResourceNotFound errors
- "Table does not exist" messages

**✅ Solution: Manually Create Tables in Azurite**

Azurite doesn't auto-create tables. Use Azure Storage Explorer or Azure CLI:

```bash
# Using Azure CLI with Azurite
az storage table create --name users --connection-string "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;"

az storage table create --name sessions --connection-string "..."
az storage table create --name submissions --connection-string "..."  
az storage table create --name votes --connection-string "..."
```

This troubleshooting guide should save future developers significant time when implementing similar MCP servers with Azure Table Storage!
