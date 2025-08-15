# Copilot Instructions for this Repo

This repository contains a minimal MCP server (Azure Functions) and an agent spec for a hackathon submissions assistant.

Primary guidance for Copilot Chat and other agents:
- Core agent spec: .github/agent_spec.md
- Agent behavior/prompt: .github/agent_prompt.md
- MCP tools schema: .github/mcp/tools.schema.json

When asking Copilot Chat for help, reference “agent spec” or “agent prompt,” and it should use these workspace docs automatically. If not, say: “Use workspace docs.”

Key intent
- The agent collects Name, Email, Idea title, Idea description.
- It saves via the MCP tool save_submission and lists via list_submissions.
- Data lives in Cosmos DB (NoSQL), deployed as Azure Functions per the spec.
