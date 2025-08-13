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

## Local dev
- Prereqs: Node 18+, Azure Functions Core Tools, npm
- Steps:
```zsh
npm install
func start
```
Optionally, create `local.settings.json` with storage and Cosmos settings if you want to hit a live Cosmos account.

## Deploy with azd
- Prereqs: Azure CLI, azd, and an Azure subscription
```zsh
azd provision --location eastus
azd deploy
```
This provisions: Storage, App Insights, Cosmos DB (serverless), and a Function App (Node 18). The app settings include COSMOS_ENDPOINT/DATABASE/CONTAINER. For production, grant the Function App Managed Identity RBAC on Cosmos and remove any keys.

## Test calls
- List tools:
```zsh
curl -s https://<FUNCTION_APP>.azurewebsites.net/api/mcp/tools | jq
```
- Save submission:
```zsh
curl -s -X POST https://<FUNCTION_APP>.azurewebsites.net/api/mcp/call \
  -H 'content-type: application/json' \
  -d '{"tool":"save_submission","arguments":{"name":"Ada","email":"ada@example.com","title":"Agent","description":"desc"}}' | jq
```
- List submissions:
```zsh
curl -s -X POST https://<FUNCTION_APP>.azurewebsites.net/api/mcp/call \
  -H 'content-type: application/json' \
  -d '{"tool":"list_submissions","arguments":{}}' | jq
```
