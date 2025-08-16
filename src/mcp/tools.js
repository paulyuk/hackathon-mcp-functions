// Tool definitions for the remote MCP server
module.exports = {
  list_users: {
    description: "List all registered users",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  get_user_sessions: {
    description: "Get game sessions for a user",
    input_schema: {
      type: "object",
      properties: {
        userId: { type: "string" }
      },
      required: ["userId"],
      additionalProperties: false
    }
  },
  save_submission: {
    description: "Persist a hackathon submission to a game session",
    input_schema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
        name: { type: "string", minLength: 1, maxLength: 100 },
        email: { type: "string" },
        title: { type: "string", minLength: 1, maxLength: 120 },
        description: { type: "string", minLength: 1, maxLength: 2000 }
      },
      required: ["sessionId", "name", "email", "title", "description"],
      additionalProperties: false
    }
  },
  list_submissions: {
    description: "List submissions for a game session",
    input_schema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
        email: { type: "string" }
      },
      required: ["sessionId"],
      additionalProperties: false
    }
  },
  save_vote: {
    description: "Save or update a vote for a submission",
    input_schema: {
      type: "object",
      properties: {
        submissionId: { type: "string" },
        voterEmail: { type: "string" },
        voteType: { type: "string", enum: ["like", "dislike"] }
      },
      required: ["submissionId", "voterEmail", "voteType"],
      additionalProperties: false
    }
  },
  create_user: {
    description: "Create a new user for testing",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1, maxLength: 100 },
        email: { type: "string" }
      },
      required: ["name", "email"],
      additionalProperties: false
    }
  },
  list_votes: {
    description: "List votes for a session or submission",
    input_schema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
        submissionId: { type: "string" }
      },
      required: ["sessionId"],
      additionalProperties: false
    }
  }
};
