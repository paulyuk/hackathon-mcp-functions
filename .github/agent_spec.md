# Hackathon Submission Agent – Spec (MCP SDK on Azure Functions v4, TypeScript)

## Overview
A minimal chat agent that collects hackathon submissions and lets users view other entries. The agent gathers four required fields and, on confirmation, saves the submission to a database via MCP tools. It can also list submissions on request.

Required fields
- Name
- Email
- Idea title
- Idea description

## Architecture (must follow official sample)
Use the official Azure sample as the baseline and follow its patterns closely:
- Repository: https://github.com/Azure-Samples/mcp-sdk-functions-hosting-node
- Azure Functions v4 programming model (TypeScript), Node 18+
- MCP server hosted inside Azure Functions using the SDK from the sample (no custom mock endpoints)
  - Single MCP server entry point wires up tools and exposes the MCP protocol according to the sample
- Data store: Azure Cosmos DB for NoSQL
  - Database: hackathon
  - Container: submissions
  - Partition key: /email
- Identity & Monitoring: Managed Identity for Functions to access Cosmos DB; Application Insights enabled

## Why this change
- Replaces ad-hoc HTTP handlers with a proper MCP server using the SDK, enabling correct tool registration, protocol semantics, and client compatibility
- Aligns with Functions v4 TypeScript best practices (app-based programming model)

## Project structure (TypeScript v4 model)
- src/
  - server/mcpServer.ts: Creates and starts the MCP server per the sample, registering tools
  - tools/saveSubmission.ts: Implements save_submission tool
  - tools/listSubmissions.ts: Implements list_submissions tool
  - shared/cosmos.ts: Cosmos client initialization (Managed Identity first, key fallback for local)
  - functions/mcp.ts: Azure Functions v4 entry binding (exports the handler via @azure/functions v4 model), delegating to the MCP server
- host.json, package.json, tsconfig.json: As per the sample, with minimal adjustments

Notes
- Prefer Cosmos DB Serverless. One container. Simple schema
- Restrict CORS only if the sample exposes HTTP negotiation endpoints that are browser-accessed

## MCP tools (contract)
Implement these tools using the MCP SDK registration mechanism shown in the sample.

- save_submission
  - params: { name: string[1..100], email: string, title: string[1..120], description: string[1..2000] }
  - result: { id, name, email, title, description, createdAt, updatedAt }
  - behavior: validate inputs, trim strings, lowercase email; upsert (idempotent) or insert (choose and document)

- list_submissions
  - params: { email?: string }
  - result: { items: Submission[] }
  - behavior: when email omitted, return recent subset (e.g., last 10)

A reference JSON schema for inputs is in .github/mcp/tools.schema.json (keep shapes consistent; actual registration uses the SDK’s tool schema support).

## Data model
Submission
- name: string (1..100)
- email: string (lowercased; RFC5322-ish shape)
- title: string (1..120)
- description: string (1..2000)
- createdAt: ISO 8601 UTC (server-set)
- updatedAt: ISO 8601 UTC (server-set)

Validation
- Required: name, email, title, description
- Trim all inputs; reject if empty after trim
- Basic email check; lowercase canonicalization

## Implementation guidance (must-do)
- Clone from or mirror the structure of Azure-Samples/mcp-sdk-functions-hosting-node
- Use @azure/functions v4 programming model in TypeScript (no classic function.json-driven JS handlers)
- Register MCP tools using the sample’s server wiring (e.g., createServer/registerTool style APIs); do not implement ad-hoc HTTP mocks
- Use Cosmos DB SDK with Managed Identity (DefaultAzureCredential) in Azure and key-based auth only for local
- Add structured logs to Application Insights via Functions telemetry

## local.settings.json (dev only)
Use only for local development; do not commit secrets to source control.

{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "AzureWebJobsFeatureFlags": "EnableWorkerIndexing",
    "COSMOS_ENDPOINT": "https://<account>.documents.azure.com:443/",
    "COSMOS_KEY": "<primary key - local only>",
    "COSMOS_DATABASE": "hackathon",
    "COSMOS_CONTAINER": "submissions"
  }
}

In Azure, omit COSMOS_KEY and rely on Managed Identity; set COSMOS_ENDPOINT/DATABASE/CONTAINER via app settings or Bicep outputs.

## IaC (Bicep) alignment
- Provision Storage (for Functions), Application Insights, Cosmos DB (serverless), and a Linux Function App (Node 18)
- Configure app settings: FUNCTIONS_WORKER_RUNTIME=node, APPLICATIONINSIGHTS_CONNECTION_STRING, COSMOS_ENDPOINT, COSMOS_DATABASE, COSMOS_CONTAINER
- Prefer Managed Identity and RBAC for Cosmos; do not set COSMOS_KEY in production

## Edge cases
- Partial info: agent continues collecting missing fields
- Invalid email: request re-entry
- Large listing: return recent subset and offer filtering by email
- Duplicate: choose consistent behavior (upsert vs reject) and keep tests accordingly

## Security & privacy
- Store only required fields; no secrets
- Cosmos DB encryption at rest; Managed Identity; minimal RBAC
- Sanitize output when listing; only return stored fields

## Requirements coverage
- Collect Name, Email, Idea title, Idea description: covered
- Save to hackathon submission database: covered (MCP tool save_submission -> Cosmos DB)
- Allow users to view other submissions: covered (MCP tool list_submissions)
- Best practices: MCP SDK sample + Functions v4 TS model + correct local.settings: covered
