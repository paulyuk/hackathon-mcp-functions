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
- Remote MCP Server: Hosted on Azure Functions using the Azure-Samples/remote-mcp-functions pattern.
  - Tools provided by the MCP server:
    - save_submission: Persist a submission
    - list_submissions: Retrieve submissions (optionally filtered by email)
- Data store: Azure Cosmos DB for NoSQL
  - Database: hackathon
  - Container: submissions
  - Partition key: /email
- Identity & Monitoring: Managed Identity for Functions to access Cosmos DB; Application Insights enabled.

Notes
- Prefer Cosmos DB Serverless. One container. Simple schema.
- Restrict CORS to expected front-ends if exposing HTTP endpoints.

## MCP tools (contract)
- save_submission
  - params schema: { name: string[1..100], email: string, title: string[1..120], description: string[1..2000] }
  - result: { id, name, email, title, description, createdAt, updatedAt }
  - behavior: validate inputs, trim strings, lowercase email; create or upsert by email+title (implementation choice)
- list_submissions
  - params schema: { email?: string }
  - result: { items: Submission[] } where Submission = above fields
  - behavior: when email omitted, return a recent subset (e.g., last 10) to keep responses concise

A reference JSON schema for both tools is provided in .github/mcp/tools.schema.json.

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

## Implementation sketch (Azure Functions + MCP Server)
- Use Azure Functions (Node.js or Python) to host the remote MCP server endpoints per Azure-Samples/remote-mcp-functions.
- Register two MCP tools in the server: save_submission and list_submissions with the schemas above.
- Use Cosmos DB SDK with Managed Identity.
- Log tool invocations and outcomes to App Insights.

## Edge cases
- Partial info provided: agent continues collecting missing fields.
- Invalid email or empty strings after trim: agent requests re-entry.
- Large listing: MCP server returns recent subset; agent offers filtering by email.
- Duplicate: treat as upsert (email+title) or reject duplicates; keep behavior consistent and documented.

## Security & privacy
- Store only required fields; no secrets.
- Cosmos DB encryption at rest; Managed Identity from Functions; minimal RBAC.
- Sanitize output when listing; only return stored fields.

## Deployment notes (concise)
- Start from https://github.com/Azure-Samples/remote-mcp-functions
- Add the two tools with the provided JSON schemas.
- Configure Cosmos DB connection via Managed Identity (no connection string secrets).
- Deploy Function App (consumption or premium) with App Insights.
- Point your MCP-capable client (e.g., Azure AI Studio Agent with MCP support) at the remote MCP server.

## Requirements coverage
- Collect Name, Email, Idea title, Idea description: covered
- Save to hackathon submission database: covered (MCP tool save_submission -> Cosmos DB)
- Allow users to view other submissions: covered (MCP tool list_submissions)
- Remind users about 2-hour scope: covered (agent prompt directive)
