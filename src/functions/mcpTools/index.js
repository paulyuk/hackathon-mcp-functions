const tools = require("../../mcp/tools");

module.exports = async function (context, req) {
  context.log("MCP tools discovery");
  context.res = {
    status: 200,
    headers: { "content-type": "application/json" },
    body: { tools }
  };
};
