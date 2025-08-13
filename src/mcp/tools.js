// Tool definitions for the remote MCP server
module.exports = {
  save_submission: {
    description: "Persist a hackathon submission",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1, maxLength: 100 },
        email: { type: "string" },
        title: { type: "string", minLength: 1, maxLength: 120 },
        description: { type: "string", minLength: 1, maxLength: 2000 }
      },
      required: ["name", "email", "title", "description"],
      additionalProperties: false
    }
  },
  list_submissions: {
    description: "List hackathon submissions",
    input_schema: {
      type: "object",
      properties: {
        email: { type: "string" }
      },
      additionalProperties: false
    }
  }
};
