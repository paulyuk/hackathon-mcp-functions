# Hackathon MCP Server (Azure Functions)

Remote MCP server exposing two tools for a hackathon submission agent:
- save_submission
- list_submissions

Backed by Azure Cosmos DB (NoSQL). Designed to pair with the prompt/spec in `.github/`.

## Endpoints
- GET /api/mcp/tools — returns tool definitions (schema)
- POST /api/mcp/call — executes a tool

## Tool contracts
See `.github/mcp/tools.schema.json` for input shapes.

## Environment
- COSMOS_ENDPOINT: Cosmos DB account endpoint (e.g., https://<account>.documents.azure.com:443/)
- COSMOS_KEY: (optional) Primary key for local/dev; omit in Azure to use Managed Identity
- COSMOS_DATABASE: hackathon (default)
- COSMOS_CONTAINER: submissions (default)

Managed Identity (recommended in Azure) will be used when COSMOS_KEY is not set and the Function App has RBAC to Cosmos DB.

## Local dev (optional)
1. Install Azure Functions Core Tools and Node 18+
2. Create `local.settings.json`:
```
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_ENDPOINT": "https://<account>.documents.azure.com:443/",
    "COSMOS_KEY": "<primary key>",
    "COSMOS_DATABASE": "hackathon",
    "COSMOS_CONTAINER": "submissions"
  }
}
```
3. npm install
4. func start

## Deployment
- Deploy to Azure Functions (Consumption or Premium)
- Assign Managed Identity and grant Cosmos DB RBAC (Read/Write on the container)
- Configure application settings: COSMOS_ENDPOINT, COSMOS_DATABASE, COSMOS_CONTAINER

## Notes
- Partition key is `/email`. Cross-partition queries are enabled for listing recent submissions.
- Timestamps set server-side (ISO UTC).
